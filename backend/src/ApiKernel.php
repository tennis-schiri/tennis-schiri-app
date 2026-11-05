<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use DomainException;
use InvalidArgumentException;
use PDOException;

/**
 * Private B0.2 JSON API dispatcher. HTTP wrapper remains DISABLED by default.
 * No CORS, no cross-origin writes and no raw email/reset tokens in responses.
 */
final class ApiKernel
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly ClubService $clubs,
        private readonly RateLimiter $rate,
        private readonly string $allowedOrigin
    ) {
        if (!str_starts_with($allowedOrigin,'https://')) {
            throw new DomainException('HTTPS-App-Origin erforderlich.');
        }
    }

    private static function value(array $body,string $key,int $max=1024): string
    {
        $v=$body[$key]??null;
        if (!is_string($v) || strlen($v)>$max) {
            throw new InvalidArgumentException('Ungültiges Formularfeld: '.$key);
        }
        return $v;
    }

    private static function cookies(string $session,string $csrf): array
    {
        return [
            [
                'name'=>'__Host-tennilo_session','value'=>$session,
                'options'=>['expires'=>time()+43200,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']
            ],
            [
                'name'=>'__Host-tennilo_csrf','value'=>$csrf,
                'options'=>['expires'=>time()+43200,'path'=>'/','secure'=>true,'httponly'=>false,'samesite'=>'Strict']
            ]
        ];
    }

    private static function expiredCookies(): array
    {
        $cookies=self::cookies('','');
        foreach ($cookies as &$cookie) $cookie['options']['expires']=time()-3600;
        unset($cookie);
        return $cookies;
    }

    private function authenticated(array $cookies,array $headers,bool $write): array
    {
        $token=$cookies['__Host-tennilo_session']??'';
        if (!is_string($token))throw new DomainException('Nicht angemeldet.');
        // Explicit empty CSRF on writes must always fail (not null).
        $csrf=$write?($headers['x-tennilo-csrf']??''):null;
        if ($write && !is_string($csrf))throw new DomainException('Formularschutz fehlt.');
        return $this->auth->requireSession($token,$csrf);
    }

    private function throttle(string $action,string $ip,?string $identity=null): void
    {
        $limits=[
            'register'=>[3,3600],
            'login'=>[15,900],
            'reset'=>[5,3600],
            'verify'=>[12,900],
            'resend'=>[3,3600],
            'club'=>[4,86400],
            'invite'=>[12,3600],
            'accept'=>[12,900]
        ];
        [$max,$window]=$limits[$action];
        $this->rate->hit($action,'ip',$ip,$max,$window);
        if ($identity!==null) {
            $this->rate->hit($action,'email',$identity,$max+3,$window);
        }
    }

    /** @return array{status:int,body:array,cookies?:array} */
    public function dispatch(
        string $method,string $path,array $body,array $cookies,
        array $headers,string $remoteAddr
    ): array {
        try {
            if ($method!=='GET') {
                // Reject missing, null or foreign origins. No Origin reflection.
                if (($headers['origin']??null)!==$this->allowedOrigin) {
                    return ['status'=>403,'body'=>['error'=>'Unzulässiger Seitenursprung.']];
                }
            }
            if ($remoteAddr==='' || strlen($remoteAddr)>64) {
                return ['status'=>400,'body'=>['error'=>'Ungültige Verbindung.']];
            }

            if ($method==='POST' && $path==='/auth/register') {
                $email=AccountPolicy::normalizeEmail(self::value($body,'email',254));
                $this->throttle('register',$remoteAddr,$email);
                $this->auth->register(
                    $email,self::value($body,'password'),
                    self::value($body,'displayName',120)
                );
                return ['status'=>202,'body'=>['message'=>'Falls möglich, wurde eine Bestätigungsmail versendet.']];
            }
            if ($method==='POST' && $path==='/auth/resend-verification') {
                $email=AccountPolicy::normalizeEmail(self::value($body,'email',254));
                $this->throttle('resend',$remoteAddr,$email);
                $this->auth->resendVerification($email);
                return ['status'=>202,'body'=>['message'=>'Falls möglich, wurde eine Bestätigungsmail versendet.']];
            }
            if ($method==='POST' && $path==='/auth/verify') {
                $this->throttle('verify',$remoteAddr);
                $this->auth->verifyEmail(self::value($body,'token',64));
                return ['status'=>200,'body'=>['verified'=>true]];
            }
            if ($method==='POST' && $path==='/auth/login') {
                $email=AccountPolicy::normalizeEmail(self::value($body,'email',254));
                $this->throttle('login',$remoteAddr,$email);
                $tokens=$this->auth->login($email,self::value($body,'password'));
                return ['status'=>200,'body'=>['authenticated'=>true],
                    'cookies'=>self::cookies($tokens['session'],$tokens['csrf'])];
            }
            if ($method==='GET' && $path==='/auth/me') {
                return ['status'=>200,'body'=>['user'=>$this->authenticated($cookies,$headers,false)]];
            }
            if ($method==='POST' && $path==='/auth/logout') {
                $this->authenticated($cookies,$headers,true);
                $this->auth->logout(
                    self::cookieValue($cookies),self::value($headers,'x-tennilo-csrf',64)
                );
                return ['status'=>200,'body'=>['loggedOut'=>true],
                    'cookies'=>self::expiredCookies()];
            }
            if ($method==='POST' && $path==='/auth/password/request') {
                $email=AccountPolicy::normalizeEmail(self::value($body,'email',254));
                $this->throttle('reset',$remoteAddr,$email);
                $this->auth->requestPasswordReset($email);
                return ['status'=>202,'body'=>['message'=>'Falls das Konto existiert, wurde eine E-Mail versendet.']];
            }
            if ($method==='POST' && $path==='/auth/password/complete') {
                $this->throttle('reset',$remoteAddr);
                $this->auth->resetPassword(
                    self::value($body,'token',64),self::value($body,'newPassword')
                );
                return ['status'=>200,'body'=>['passwordChanged'=>true]];
            }
            if ($method==='GET' && $path==='/clubs') {
                $user=$this->authenticated($cookies,$headers,false);
                return ['status'=>200,'body'=>['clubs'=>$this->clubs->listOrganizations($user['id'])]];
            }
            if ($method==='POST' && $path==='/clubs') {
                $user=$this->authenticated($cookies,$headers,true);
                $this->rate->hit('club','user',$user['id'],4,86400);
                $id=$this->clubs->createOrganization(
                    $user['id'],self::value($body,'name',160),
                    self::value($body,'slug',80)
                );
                return ['status'=>201,'body'=>['id'=>$id]];
            }
            if ($method==='POST' && $path==='/invitations/accept') {
                $user=$this->authenticated($cookies,$headers,true);
                $this->throttle('accept',$remoteAddr);
                $id=$this->clubs->acceptInvitation($user['id'],self::value($body,'token',64));
                return ['status'=>200,'body'=>['organizationId'=>$id]];
            }
            if (preg_match('~^/clubs/([a-f0-9-]{36})/members$~D',$path,$m)) {
                if ($method==='GET') {
                    $user=$this->authenticated($cookies,$headers,false);
                    return ['status'=>200,'body'=>['members'=>$this->clubs->members($user['id'],$m[1])]];
                }
            }
            if (preg_match('~^/clubs/([a-f0-9-]{36})/invitations$~D',$path,$m)
                && $method==='POST') {
                $user=$this->authenticated($cookies,$headers,true);
                $this->throttle('invite',$remoteAddr);
                $this->clubs->invite(
                    $user['id'],$m[1],self::value($body,'email',254),
                    self::value($body,'role',30)
                );
                return ['status'=>202,'body'=>['invited'=>true]];
            }
            if (preg_match('~^/clubs/([a-f0-9-]{36})/members/([a-f0-9-]{36})$~D',$path,$m)) {
                $user=$this->authenticated($cookies,$headers,true);
                if ($method==='DELETE') {
                    $this->clubs->removeMember($user['id'],$m[1],$m[2]);
                    return ['status'=>200,'body'=>['removed'=>true]];
                }
                if ($method==='PATCH') {
                    $this->clubs->changeRole(
                        $user['id'],$m[1],$m[2],self::value($body,'role',30)
                    );
                    return ['status'=>200,'body'=>['roleChanged'=>true]];
                }
            }
            return ['status'=>404,'body'=>['error'=>'Diese API-Aktion gibt es nicht.']];
        } catch (DomainException $e) {
            $limited=str_starts_with($e->getMessage(),'Zu viele Anfragen.');
            return ['status'=>$limited?429:403,
                'body'=>['error'=>$limited?'Zu viele Anfragen. Bitte später erneut versuchen.':
                    'Aktion nicht erlaubt oder Link ungültig.']];
        } catch (InvalidArgumentException $e) {
            return ['status'=>400,'body'=>['error'=>'Ungültige Angaben.']];
        } catch (\Throwable $e) {
            // Never expose DB details, hashes, token values or stack traces.
            return ['status'=>503,'body'=>['error'=>'Dienst momentan nicht verfügbar.']];
        }
    }

    private static function cookieValue(array $cookies): string
    {
        $v=$cookies['__Host-tennilo_session']??'';
        return is_string($v)?$v:'';
    }
}
