"""Demonstração em localhost; banco e arquivos exclusivamente em memória."""
import argparse,json,os,secrets,socket,sys,threading,webbrowser
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument("--no-browser",action="store_true")
parser.add_argument("--api-port",type=int,default=8000)
parser.add_argument("--web-port",type=int,default=4173)
ARGS=parser.parse_args()
FRONTEND=f"http://localhost:{ARGS.web_port}"
BACKEND=f"http://localhost:{ARGS.api_port}"
for port in (ARGS.api_port,ARGS.web_port):
    with socket.socket() as check:
        try: check.bind(("127.0.0.1",port))
        except OSError: raise SystemExit(f"Porta {port} ocupada. Feche a outra demonstração.")
if not (ROOT/"frontend/build/index.html").is_file():
    raise SystemExit("Na pasta frontend, execute npm ci e npm run build primeiro.")
os.environ.update({
    "MONGO_URL":"mongodb://localhost:27017","DB_NAME":"demo_memory",
    "JWT_SECRET":secrets.token_urlsafe(48),"APP_ENV":"development",
    "COOKIE_SECURE":"false","COOKIE_SAMESITE":"lax",
    "FRONTEND_URL":FRONTEND,"CORS_ORIGINS":FRONTEND,
    "GOOGLE_CLIENT_ID":"","GOOGLE_CLIENT_SECRET":"","GOOGLE_REDIRECT_URI":"",
    "ADMIN_EMAIL":"","ADMIN_PASSWORD":"","R2_BUCKET_NAME":"","R2_ENDPOINT_URL":"",
    "R2_ACCESS_KEY_ID":"","R2_SECRET_ACCESS_KEY":""})
sys.path.insert(0,str(ROOT/"backend"))
import server
from mongomock_motor import AsyncMongoMockClient
server.db=AsyncMongoMockClient()["demo"]
objects={}
def put(path,data,ct):
    objects[path]=(data,ct)
    return {"path":path}
server.put_object=put
server.get_object=lambda path:objects[path]
async def seed():
    master={"id":server.new_id(),"email":"mestre@exemplo.com","name":"Mestre das Crônicas","role":"master","password_hash":server.hash_password("GrimoorioTeste123!"),"created_at":server.now_iso()}
    player={"id":server.new_id(),"email":"jogador@exemplo.com","name":"Aventureiro","role":"player","password_hash":server.hash_password("GrimoorioTeste123!"),"created_at":server.now_iso()}
    await server.db.users.insert_many([master,player])
    presets=json.loads((ROOT/"frontend/src/lib/templatePresets.js").read_text(encoding="utf-8").split(" = ",1)[1].rstrip(";\n"))
    templates=[]
    for preset in presets:
        templates.append(await server.create_template(server.TemplateIn(**preset,is_public=True),master))
    camp=await server.create_campaign(server.CampaignIn(name="As Crônicas do Crepúsculo",description="Uma antiga floresta guarda o segredo de uma estrela caída.",template_id=templates[0]["id"]),master)
    await server.join_campaign(server.JoinIn(code=camp["invite_code"]),player)
    await server.create_character(server.CharacterIn(name="Kaelith, a Sombra",class_name="Ranger",race="Elfo",level=5,hp_current=38,hp_max=45,armor_class=16,campaign_id=camp["id"],attributes={"str":14,"dex":18,"con":13,"int":10,"wis":16,"cha":8},inventory=[{"name":"Arco longo","qty":1,"weight":1,"category":"weapon","equipped":True}],custom_fields={"ideal":"Proteger a floresta","bond":"A última guardiã","inspiration":True}),player)
    await server.create_character(server.CharacterIn(name="Liora, a Cronista",class_name="Barda",race="Humana",level=4,hp_current=26,hp_max=30,campaign_id=camp["id"]),master)
    await server.create_session_note(server.SessionNoteIn(campaign_id=camp["id"],title="A estrela e o bosque",content="O grupo encontrou um mapa na estalagem. A trilha segue para o norte.",session_number=1),master)
    await server.create_npc(server.NPCIn(campaign_id=camp["id"],name="A guardiã do bosque",description="Ela conhece o caminho, mas cobra uma história em troca."),master)
server.app.router.add_event_handler("startup",seed)
class DemoHandler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT/"frontend/build"),**kwargs)
    def do_GET(self):
        path=self.path.split("?")[0]
        if path=="/" or not Path(self.translate_path(path)).is_file():
            html=(ROOT/"frontend/build/index.html").read_text(encoding="utf-8")
            html=html.replace("<head>",f'<head><script>window.__GRIMOORIO_API_URL__="{BACKEND}";</script>',1)
            content=html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.send_header("Content-Length",str(len(content)))
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(content)
            return
        return super().do_GET()
    def log_message(self,*args): pass
if __name__=="__main__":
    http=ThreadingHTTPServer(("127.0.0.1",ARGS.web_port),DemoHandler)
    threading.Thread(target=http.serve_forever,daemon=True).start()
    print(f"\nGRIMOORIO - DEMONSTRAÇÃO LOCAL\n{FRONTEND}\n")
    print("Mestre: mestre@exemplo.com | Jogador: jogador@exemplo.com")
    print("Senha fictícia: GrimoorioTeste123!")
    print("Dados e uploads temporários. Google e serviços de produção desativados.")
    print("Pressione Ctrl+C para encerrar.\n",flush=True)
    if not ARGS.no_browser:
        threading.Timer(1.5,lambda:webbrowser.open(FRONTEND)).start()
    import uvicorn
    try: uvicorn.run(server.app,host="127.0.0.1",port=ARGS.api_port,log_level="warning")
    finally: http.shutdown()
