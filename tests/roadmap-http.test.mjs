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
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const port=server.address().port;
  server.close();
  await once(server,"close");
  return port;
}
function cookieFrom(response,previous=""){
  const header=response.headers.get("set-cookie");
  return header?header.split(";")[0]:previous;
}
test("Roadmap HTTP: nur eingeladene Personen dürfen schreiben, Admin verwaltet Status und Zugänge",{timeout:25000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),"tennilo-roadmap-ci-"));
  const site=fileURLToPath(new URL("../site/",import.meta.url));
  const router=fileURLToPath(new URL("./roadmap-router.php",import.meta.url));
  const port=await freePort(),base="http://127.0.0.1:"+port+"/roadmap-api.php";
  const origin="https://127.0.0.1:"+port;
  const server=spawn("php",["-S","127.0.0.1:"+port,"-t",site,router],{
    env:{...process.env,TENNILO_ROADMAP_STORAGE_DIR:dir},stdio:["ignore","pipe","pipe"]
  });
  let errors="";
  server.stderr.on("data",data=>{errors+=String(data).slice(-2000);});
  async function request(action,payload={},cookie="",csrf="",overrideOrigin=origin){
    const response=await fetch(base,{method:"POST",
      headers:{"Content-Type":"application/json","Origin":overrideOrigin,...(cookie?{"Cookie":cookie}:{})},
      body:JSON.stringify({action,csrf,...payload})});
    return {status:response.status,cookie:cookieFrom(response,cookie),data:await response.json()};
  }
  async function get(cookie=""){
    const response=await fetch(base,{headers:cookie?{"Cookie":cookie}:{}});
    return {status:response.status,cookie:cookieFrom(response,cookie),data:await response.json()};
  }
  try{
    let ready=false;
    for(let n=0;n<30;n++){
      if(server.exitCode!==null)throw Error("PHP server exit: "+errors);
      try{const res=await get();if(res.status===200){ready=true;break;}}catch{}
      await pause(100);
    }
    assert.equal(ready,true,"Roadmap API started: "+errors);
    const first=await get();
    assert.equal(first.status,200);
    assert.equal(first.data.items.length>=15,true);
    assert.equal(first.data.bootstrapAvailable,true);
    assert.equal(first.data.session.role,"guest");
    const bad=await request("bootstrap",{},first.cookie,"wrong");
    assert.equal(bad.status,403,"Invalid CSRF blocked");
    const setup=await request("bootstrap",{},first.cookie,first.data.session.csrf);
    assert.equal(setup.status,200);
    assert.match(setup.data.ownerCode,/^[a-f0-9]{48}$/);
    const admin=await get(setup.cookie);
    assert.equal(admin.data.session.role,"admin");
    assert.equal(admin.data.bootstrapAvailable,false);

    const crossOrigin=await request("invite",{label:"Testperson",role:"commenter"},
      admin.cookie,admin.data.session.csrf,"https://evil.example");
    assert.equal(crossOrigin.status,403,"Cross-origin request blocked");
    const invite=await request("invite",{label:"Person A",role:"commenter"},
      admin.cookie,admin.data.session.csrf);
    assert.equal(invite.status,200);
    assert.match(invite.data.inviteCode,/^[a-f0-9]{48}$/);

    const guest=await get();
    const guestComment=await request("comment",{itemId:first.data.items[0].id,text:"Unzulässig"},
      guest.cookie,guest.data.session.csrf);
    assert.equal(guestComment.status,403,"Guest cannot comment");

    const login=await request("login",{code:invite.data.inviteCode},
      guest.cookie,guest.data.session.csrf);
    assert.equal(login.status,200);
    const member=await get(login.cookie);
    assert.equal(member.data.session.role,"commenter");
    const itemId=first.data.items[0].id;
    const comment=await request("comment",{itemId,text:"Guter Vorschlag für unseren Verein."},
      member.cookie,member.data.session.csrf);
    assert.equal(comment.status,200);

    await pause(2100); // Two writes from the same admin session are rate-limited.
    const updated=await request("update",{itemId,priority:"high",status:"test"},
      admin.cookie,admin.data.session.csrf);
    assert.equal(updated.status,200);
    const check=await get(admin.cookie);
    const item=check.data.items.find(x=>x.id===itemId);
    assert.equal(item.status,"test");
    assert.equal(item.comments.length,1);
    assert.equal(item.comments[0].author,"Person A");
    assert.equal(check.data.members.length,1);

    await pause(2100);
    const revoked=await request("revoke",{inviteId:check.data.members[0].id},
      admin.cookie,admin.data.session.csrf);
    assert.equal(revoked.status,200);
    const revokedSession=await get(member.cookie);
    assert.equal(revokedSession.data.session.role,"guest","Revocation applies immediately");
    const forbidden=await request("comment",{itemId,text:"Nicht mehr erlaubt"},
      member.cookie,revokedSession.data.session.csrf);
    assert.equal(forbidden.status,403);

    const stored=JSON.parse(await readFile(join(dir,"state.json"),"utf8"));
    assert.equal(stored.items.find(x=>x.id===itemId).comments.length,1);
    assert.equal(JSON.stringify(stored).includes(setup.data.ownerCode),false);
    assert.equal(JSON.stringify(stored).includes(invite.data.inviteCode),false);
  }finally{
    server.kill("SIGTERM");
    if(server.exitCode===null)await Promise.race([once(server,"exit"),pause(1200)]);
    await rm(dir,{recursive:true,force:true});
  }
});
