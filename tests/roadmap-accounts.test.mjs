import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {mkdtemp,rm,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createServer} from "node:net";

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){
  const server=createServer();
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const port=server.address().port;
  server.close();await once(server,"close");return port;
}
const cookieOf=(res,old="")=>res.headers.get("set-cookie")?.split(";")[0]||old;

test("Roadmap: persönlicher Login, einmalige Einladungen, Rollenwechsel, Passwortwechsel und Widerruf",{timeout:30000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),"tennilo-roadmap-accounts-"));
  const site=fileURLToPath(new URL("../site/",import.meta.url));
  const router=fileURLToPath(new URL("./roadmap-router.php",import.meta.url));
  const port=await freePort(),url="http://127.0.0.1:"+port+"/roadmap-api.php",origin="https://127.0.0.1:"+port;
  const server=spawn("php",["-S","127.0.0.1:"+port,"-t",site,router],{
    env:{...process.env,TENNILO_ROADMAP_STORAGE_DIR:dir},stdio:["ignore","pipe","pipe"]});
  let log="";server.stderr.on("data",b=>{log+=String(b).slice(-1800)});
  const get=async(cookie="")=>{
    const res=await fetch(url,{headers:cookie?{"Cookie":cookie}:{}});
    return {status:res.status,cookie:cookieOf(res,cookie),data:await res.json()};
  };
  const post=async(action,body={},session)=>{
    const res=await fetch(url,{method:"POST",headers:{
      "Content-Type":"application/json","Origin":origin,...(session.cookie?{"Cookie":session.cookie}:{})
    },body:JSON.stringify({action,csrf:session.data.session.csrf,...body})});
    return {status:res.status,cookie:cookieOf(res,session.cookie),data:await res.json()};
  };
  try{
    let ready=false;
    for(let i=0;i<40;i++){
      if(server.exitCode!==null)throw Error("PHP terminated: "+log);
      try{const x=await get();if(x.status===200){ready=true;break;}}catch{}
      await pause(100);
    }
    assert.equal(ready,true,"PHP HTTP server "+log);
    const first=await get();
    assert.equal(first.data.bootstrapAvailable,true);
    assert.equal(first.data.session.role,"guest");
    const invalid=await post("bootstrap-account",{username:"owner",password:"short"},first);
    assert.equal(invalid.status,422);
    const created=await post("bootstrap-account",{username:"leitung.test",password:"LangUndEinmalig2026!"},first);
    assert.equal(created.status,200);
    let owner=await get(created.cookie);
    assert.equal(owner.data.bootstrapAvailable,false);
    assert.equal(owner.data.session.role,"admin");
    assert.equal(owner.data.session.account,true);
    assert.equal(owner.data.session.username,"leitung.test");

    const outOfOrigin=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Origin":"https://evil.example","Cookie":owner.cookie},
      body:JSON.stringify({action:"invite-link",csrf:owner.data.session.csrf,label:"Evil",role:"commenter"})});
    assert.equal(outOfOrigin.status,403);
    const invite=await post("invite-link",{label:"Person A",role:"viewer"},owner);
    assert.equal(invite.status,200);
    assert.match(invite.data.inviteToken,/^[a-f0-9]{48}$/);
    const token=invite.data.inviteToken;

    let guest=await get();
    const withoutToken=await post("register-invite",{username:"petra",password:"EineSicherePassphrase2026!"},guest);
    assert.equal(withoutToken.status,403);
    const accepted=await post("register-invite",{
      token,username:"petra",password:"EineSicherePassphrase2026!"},guest);
    assert.equal(accepted.status,200);
    let member=await get(accepted.cookie);
    assert.equal(member.data.session.role,"viewer");
    assert.equal(member.data.session.account,true);
    assert.equal(member.data.session.username,"petra");
    assert.equal((await post("register-invite",{token,username:"zweite",password:"AndereSicherePassphrase1!"},await get())).status,403);
    assert.equal((await post("comment",{itemId:member.data.items[0].id,text:"Unzulässig"},member)).status,403);

    await pause(2100);
    const promoted=await post("set-role",{inviteId:owner.data.members[0]?.id||invite.data.session?.id||"none",role:"commenter"},owner);
    // The owner data above was loaded before invitation; always resolve the current member ID.
    if(promoted.status===404){
      owner=await get(owner.cookie);
      const retry=await post("set-role",{inviteId:owner.data.members[0].id,role:"commenter"},owner);
      assert.equal(retry.status,200);
    }else assert.equal(promoted.status,200);
    member=await get(member.cookie);
    assert.equal(member.data.session.role,"commenter");
    const saved=await post("comment",{itemId:member.data.items[0].id,text:"Unsere Anregung"},member);
    assert.equal(saved.status,200);

    const pass=await post("change-password",{oldPassword:"EineSicherePassphrase2026!",newPassword:"NochSichererPasswort2027!"},member);
    assert.equal(pass.status,200);
    const changed=await get(pass.cookie);
    assert.equal(changed.data.session.role,"commenter");
    const logout=await post("logout",{},changed);assert.equal(logout.status,200);
    const oldLogin=await post("login-account",{username:"petra",password:"EineSicherePassphrase2026!"},await get(logout.cookie));
    assert.equal(oldLogin.status,403);
    const newLogin=await post("login-account",{username:"petra",password:"NochSichererPasswort2027!"},await get(logout.cookie));
    assert.equal(newLogin.status,200);
    member=await get(newLogin.cookie);
    assert.equal(member.data.session.role,"commenter");
    assert.equal(member.data.items.find(x=>x.id===first.data.items[0].id).comments.length,1);

    owner=await get(owner.cookie);
    await pause(2100);
    const revoked=await post("revoke",{inviteId:owner.data.members[0].id},owner);
    assert.equal(revoked.status,200);
    member=await get(member.cookie);
    assert.equal(member.data.session.role,"guest");
    assert.equal((await post("comment",{itemId:first.data.items[0].id,text:"Nicht mehr erlaubt"},member)).status,403);

    const disk=JSON.parse(await readFile(join(dir,"state.json"),"utf8"));
    const dump=JSON.stringify(disk);
    assert.equal(dump.includes("EineSicherePassphrase2026!"),false);
    assert.equal(dump.includes("NochSichererPasswort2027!"),false);
    assert.equal(dump.includes(token),false);
    assert.equal(dump.includes("LangUndEinmalig2026!"),false);
    assert.match(disk.ownerAccount.passwordHash,/^\$2[aby]\$/);
    assert.equal(disk.items.find(x=>x.id===first.data.items[0].id).comments.length,1);
  }finally{
    server.kill("SIGTERM");
    if(server.exitCode===null)await Promise.race([once(server,"exit"),pause(1200)]);
    await rm(dir,{recursive:true,force:true});
  }
});

test("Roadmap: alte Projektleitungs-Codes lassen sich ohne Verlust migrieren",{timeout:12000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),"tennilo-roadmap-upgrade-"));
  const site=fileURLToPath(new URL("../site/",import.meta.url));
  const router=fileURLToPath(new URL("./roadmap-router.php",import.meta.url));
  const port=await freePort(),url="http://127.0.0.1:"+port+"/roadmap-api.php",origin="https://127.0.0.1:"+port;
  const server=spawn("php",["-S","127.0.0.1:"+port,"-t",site,router],{
    env:{...process.env,TENNILO_ROADMAP_STORAGE_DIR:dir},stdio:["ignore","pipe","pipe"]});
  const get=async(cookie="")=>{
    const r=await fetch(url,{headers:cookie?{"Cookie":cookie}:{}});return {cookie:cookieOf(r,cookie),status:r.status,data:await r.json()};
  };
  const post=async(action,payload,s)=>{
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Origin":origin,"Cookie":s.cookie},
      body:JSON.stringify({action,csrf:s.data.session.csrf,...payload})});
    return {cookie:cookieOf(r,s.cookie),status:r.status,data:await r.json()};
  };
  try{
    let guest;
    for(let i=0;i<40;i++){try{guest=await get();if(guest.status===200)break;}catch{}await pause(100);}
    assert.equal(guest?.status,200);
    const legacy=await post("bootstrap",{},guest);assert.equal(legacy.status,200);
    const active=await get(legacy.cookie);assert.equal(active.data.session.account,false);
    const upgraded=await post("upgrade-account",{username:"projektleitung",password:"MeinNeuesPasswort2027!"},active);
    assert.equal(upgraded.status,200);
    const asAdmin=await get(upgraded.cookie);
    assert.equal(asAdmin.data.session.role,"admin");
    assert.equal(asAdmin.data.session.account,true);
    const oldCodeSession=await post("login",{code:legacy.data.ownerCode},await get());
    assert.equal(oldCodeSession.status,403);
    const newSession=await post("login-account",{username:"projektleitung",password:"MeinNeuesPasswort2027!"},await get());
    assert.equal(newSession.status,200);
    const disk=JSON.parse(await readFile(join(dir,"state.json"),"utf8"));
    assert.equal(disk.adminHash,null);
    assert.equal(disk.items.length,guest.data.items.length);
  }finally{
    server.kill("SIGTERM");
    if(server.exitCode===null)await Promise.race([once(server,"exit"),pause(1200)]);
    await rm(dir,{recursive:true,force:true});
  }
});
