import argparse,json,time
from urllib.parse import urlparse
from pathlib import Path
import requests
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"artifacts"
ART.mkdir(exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument("--base",default="http://localhost:4173")
parser.add_argument("--api",default="http://localhost:8000/api")
args=parser.parse_args()
BASE=args.base.rstrip("/")
API=args.api.rstrip("/")
assert all(urlparse(url).hostname in ("localhost","127.0.0.1") for url in (BASE,API)), "Use apenas servidores locais"

session=requests.Session()
session.headers["Origin"]=BASE
email=f"qa{int(time.time())}@example.com"
password="GrimoorioTeste123!"
def post(path,body):
    r=session.post(API+path,json=body,timeout=20);r.raise_for_status();return r.json()
post("/auth/register",{"email":email,"password":password,"name":"Mestre das Crônicas","role":"master"})
presets=json.loads((ROOT/"frontend/src/lib/templatePresets.js").read_text(encoding="utf-8").split(" = ",1)[1].rstrip(";\n"))
template=post("/templates",{**presets[0],"is_public":False})
camp=post("/campaigns",{"name":"As Crônicas do Crepúsculo","system":"dnd5e","template_id":template["id"]})
character=post("/characters",{"name":"Kaelith, a Sombra","campaign_id":camp["id"],"class_name":"Ranger","race":"Elfo","level":5,"hp_current":38,"hp_max":45})
results=[];errors=[]
def record(text): results.append(text);print("PASS:",text,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",headless=True)
    context=browser.new_context(viewport={"width":1440,"height":1000},device_scale_factor=1)
    page=context.new_page()
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until="networkidle")
    page.get_by_role("heading",name="Grandes histórias. Uma só mesa.").wait_for()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.screenshot(path=str(ART/"01-inicio-desktop.png"),full_page=True)
    record("Landing desktop renders without horizontal overflow")
    page.set_viewport_size({"width":390,"height":844})
    page.screenshot(path=str(ART/"02-inicio-celular.png"),full_page=True)
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    record("Landing mobile fits a 390px viewport")
    page.goto(BASE+"/login",wait_until="networkidle")
    assert page.get_by_text("Continuar com Google",exact=True).count()==0
    page.get_by_test_id("login-email-input").fill(email)
    page.get_by_test_id("login-password-input").fill(password)
    page.get_by_test_id("login-submit-btn").click()
    page.wait_for_url("**/app")
    page.get_by_text("Kaelith, a Sombra",exact=True).wait_for()
    page.screenshot(path=str(ART/"03-painel-celular.png"),full_page=True)
    record("Password sign-in and mobile dashboard")
    page.get_by_test_id("open-menu-btn").click()
    page.get_by_test_id("nav-templates").click()
    page.get_by_role("heading",name="Sistemas & Modelos").wait_for()
    assert not page.get_by_test_id("open-menu-btn").get_attribute("aria-expanded")=="true"
    page.set_viewport_size({"width":1440,"height":1000})
    page.screenshot(path=str(ART/"04-modelos.png"),full_page=True)
    record("Mobile navigation closes after changing pages; template presets render")
    page.goto(BASE+f"/app/templates/{template['id']}",wait_until="networkidle")
    page.get_by_label("Nome de Atributos 1",exact=True).fill("Vigor")
    page.get_by_label("Nome do campo",exact=True).first.fill("Destino")
    page.get_by_label("Prévia do modelo").get_by_text("Vigor",exact=True).wait_for()
    page.get_by_test_id("tpl-save-btn").click()
    page.get_by_role("button",name="Tudo salvo",exact=True).wait_for()
    assert session.get(API+f"/templates/{template['id']}").json()["attributes_schema"][0]["label"]=="Vigor"
    page.screenshot(path=str(ART/"05-editor-modelos.png"),full_page=True)
    record("Live model preview, editing and server persistence")
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    record("Model editor fits a 390px viewport")
    page.set_viewport_size({"width":1440,"height":1000})
    page.goto(BASE+f"/app/characters/{character['id']}",wait_until="networkidle")
    page.get_by_label("Destino",exact=True).fill("Proteger a floresta")
    page.get_by_label("Inspiração",exact=True).check()
    page.get_by_label("Destino",exact=True).blur()
    page.wait_for_timeout(1200)
    data=session.get(API+f"/characters/{character['id']}").json()
    assert data["custom_fields"]["ideal"]=="Proteger a floresta",data
    assert data["custom_fields"]["inspiration"] is True,data
    page.reload(wait_until="networkidle")
    assert page.get_by_label("Destino",exact=True).input_value()=="Proteger a floresta"
    assert page.get_by_label("Inspiração",exact=True).is_checked()
    page.screenshot(path=str(ART/"06-ficha.png"),full_page=True)
    record("Rapid custom-field edits and checkbox save correctly across reload")
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.screenshot(path=str(ART/"07-ficha-celular.png"),full_page=True)
    record("Character sheet fits a 390px viewport")
    cookies=context.cookies("http://localhost:8000")
    access=next(c for c in cookies if c["name"]=="access_token")
    access["value"]="expired"
    context.add_cookies([access])
    page.goto(BASE+"/app",wait_until="networkidle")
    page.get_by_text("Kaelith, a Sombra",exact=True).wait_for()
    record("Browser automatically refreshes an expired access session")
    page.set_viewport_size({"width":1440,"height":1000})
    page.goto(BASE+f"/app/campaigns/{camp['id']}",wait_until="networkidle")
    page.get_by_text("As Crônicas do Crepúsculo",exact=True).first.wait_for()
    page.screenshot(path=str(ART/"08-campanha.png"),full_page=True)
    record("Campaign detail loads")
    assert not errors,errors
    record("No JavaScript runtime errors in tested flows")
    browser.close()
(ART/"browser-results.json").write_text(json.dumps({"checks":results,"errors":errors},indent=2,ensure_ascii=False),encoding="utf-8")
print(f"Completed {len(results)} browser checks. Screenshots: {ART}",flush=True)
