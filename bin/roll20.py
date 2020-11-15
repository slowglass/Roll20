#!/c/Users/chris/AppData/Local/Programs/Python/Python38-32/python
import sys
import os
import requests as req
import pickle
import yaml
import json

from datetime import datetime
from pprint import pprint
from lxml import html
from pathlib import Path


class Game:
    game = ""
    home = ""
    def __init__(self, name):
        self.game = name
        self.home = str(Path.home())

    def reset(self, args):
        config = {'modules':[]}
        game_dir = f'{self.home}/.roll20/{self.game}'
        if not os.path.exists(game_dir):
            os.mkdir(game_dir)
        with open(f'{game_dir}/config.yaml', 'w') as yaml_file:
            dump = yaml.dump(config)
            yaml_file.write( dump )
        print(f'Reset {self.game} config')

    def add(self, args):
        game_dir = f'{self.home}/.roll20/{self.game}'
        if not os.path.exists(f'{game_dir}/config.yaml'):
            self.reset()
        config = {'modules':[]}
        with open(f'{game_dir}/config.yaml'.strip(), "r") as yaml_file:
            config = yaml.safe_load(yaml_file.read())
        for module in args:
            print(f'Appending {module}')
            config['modules'].append(module)
        with open(f'{game_dir}/config.yaml', 'w') as yaml_file:
            dump = yaml.dump(config)
            yaml_file.write( dump )

class ConfigInserter:
    def processNext(self, data):
        print(f'   Processing YAML Include')
        prefix = "{ /* yaml:"
        postfix = "*/}"
        start = data.find(prefix)
        if (start==-1):
            return (False, data)
        end = data.find(postfix);
        if (end==-1):
            return (False, data)
        file_name=data[start+len(prefix):end]
        print(f'   Processing YAML ${file_name}')
        file = open(file_name.strip(), "r")
        encoded_yaml = json.dumps(yaml.safe_load(file.read()))
        return (True, data.replace(data[start:end+len(postfix)], encoded_yaml))

    def read(self, path):
        print(f'   Processing File {path}')
        with open(path, 'r') as file:
            data = file.read()
        more = True
        while more:
            more, data = self.processNext(data)
        now = datetime.now()
        return data.replace('UPLOAD-TIMESTAMP', now.strftime("%H:%M:%S %d/%m/%Y"))

class Roll20:
    verbose=False
    NO_ID="NO ID"
    ROLL20="https://app.roll20.net"
    campaigns = {}
    scripts = {}

    def __init__(self):
        self.s = req.Session()

    def debug(self,info):
        if (self.verbose):
            print(info)

    def page_error(self, page):
        error_file = open("roll20.error.html", "w")
        n = error_file.write(page.text)
        error_file.close()
        print("Failed to process page {page.url}. Please see roll20.error.html")
        exit()

    def argsCheck(self, where, num):
        if len(sys.argv)<num:
            print(f'Incorrect number of arguments for {where}\n')
            roll20.usage()
            exit()

    def usage(self):
        print("Usage:")
        print(" authenticate <user> <password>")
        print(" upload <game> <script> <script> <script> ....")
        print(" delete <game> <script> <script> <script> ....")
        print(" reset <game>")

    def login(self):
        home = str(Path.home())
        credentials = {}
        try:
            with open(f'{home}/.roll20/credentials', 'rb') as credentials_file:
                credentials = pickle.load(credentials_file)
        except:
            credentials = {}

        if not 'password' in credentials:
            print("No credentials available\n")
            roll20.usage()
            exit()

        page = self.s.post(f'{self.ROLL20}/sessions/create', credentials, allow_redirects = False)
        if page.status_code != 303:
            return False
        if page.headers["Location"] != f'{self.ROLL20}/home/':
            return False
        return True

    def getScripts(self, game_id):
        try:
            page = self.s.get(f'{self.ROLL20}/campaigns/scripts/{game_id}')
            if len(page.text)< 200:
                print(f'{page.status_code} : {page.text}')
            tree = html.fromstring(page.content)
            tabs = tree.xpath("//ul[contains(@class, 'nav-tabs')]")[0]
            anchors = tabs.xpath('//a[@data-toggle="tab"]')
            self.debug("Scripts")
            for a in anchors:
                worldImg=a.xpath("div")
                if len(worldImg)>0:
                    continue
                txt = "".join(a.xpath('text()')).strip()
                refs = a.xpath('@href')
                ref = refs[0].partition("#script-")[2]
                if not ref.isdigit():
                    continue
                self.debug(f'   {ref} => "{txt}"')
                self.scripts[txt]=ref
        except:
            self.page_error(page)

    def getScript(self, game_id, script_name):
        if len(self.scripts)==0:
            self.getScripts(game_id)
        if script_name in self.scripts:
            return self.scripts[script_name]
        else:
            return self.NO_ID;
            exit()

    def getCampaigns(self, pageNumber):
        page_text = ""
        try:
            url = "/campaigns/search/?p="
            page = self.s.get(f'{self.ROLL20}{url}{str(pageNumber)}')
            if len(page.text)< 200:
                print(f'{page.status_code} : {page.text}')
            tree = html.fromstring(page.content)
            campaigns = tree.xpath("//div[contains(@class, 'campaigns')]")[0]
            anchors = campaigns.xpath("//h3[contains(@class, 'campaignname')]/a")
            if (pageNumber == 1):
                self.debug("Campaigns")
            for a in anchors:
                txt = "".join(a.xpath('text()')).strip()
                refs = a.xpath('@href')
                ref = refs[0].partition("/campaigns/details/")[2]
                if not ref.isdigit():
                    continue
                self.debug(f'   {ref} => "{txt}"')
                self.campaigns[txt]=ref
            pageNumber = pageNumber + 1
            anchors = tree.xpath('//a[@href="'+url+str(pageNumber)+'"]')
            if len(anchors)>0:
                self.getCampaigns(pageNumber)
        except:
            self.page_error(page)

    def getCampaign(self, campaign):
        if len(self.campaigns)==0:
            self.getCampaigns(1)

        if campaign in  self.campaigns:
            return self.campaigns[campaign]
        else:
            print(f'Campaign "{campaign}" not found. Exiting')
            exit()

    def sendDelete(self, game_name, script_name):
        game_id = self.getCampaign(game_name)
        script_id = self.getScript(game_id, script_name)
        if (script_id == self.NO_ID):
            self.debug(f'Cannot find "{script_name}" in Game "{game_name}')
            return

        self.debug(f'Deleting "{script_name}" from Game "{game_name}"')
        data = {'name': script_name}
        page_error = self.s.post(f'{self.ROLL20}/campaigns/delete_script/{game_id}/{script_id}', data=data)
        if page_error.text != "success":
            self.page_error(page)


    def authenticate(self):
        self.argsCheck("authenticate", 4)
        home = str(Path.home())
        roll20_dir = f'{home}/.roll20'
        if not os.path.exists(roll20_dir):
            os.mkdir(roll20_dir)
        credentials = { 'email': sys.argv[2], 'password': sys.argv[3] }
        with open(f'{home}/.roll20/credentials', 'wb') as credentials_file:
            pickle.dump(credentials, credentials_file)

    def games(self):
        self.getCampaigns(1)
        print("Campaigns")
        for game_name in self.campaigns:
            print(f'  {game_name}: ', end = '')
            game_id = self.getCampaign(game_name)
            self.scripts = {}
            self.getScripts(game_id)
            print(','.join(self.scripts.keys()))

    def upload(self):
        self.argsCheck("upload", 4)
        game_name = sys.argv[2]
        game_id = self.getCampaign(game_name)
        for script_path in sys.argv[3:]:
            print(f'Uploading {script_path}')
            script_name = script_path.split("/")[-1]
            script_id = self.getScript(game_id, script_name)
            content = ConfigInserter().read(script_path)
            data = {'name': script_name, 'content': content}
            if script_id == self.NO_ID:
                self.debug(f'Adding "{script_name}" to Game "{game_name} using "{script_path}"')
                page = self.s.post(f'{self.ROLL20}/campaigns/save_script/{game_id}/new', data=data)
            else:
                self.debug(f'Updating "{script_name}" to Game "{game_name} using "{script_path}"')
                page = self.s.post(f'{self.ROLL20}/campaigns/save_script/{game_id}/{script_id}', data=data)
            if page.text != "success":
                self.page_error(page)
        print("Success")

    def delete(self):
        self.argsCheck("delete", 4)
        game_name = sys.argv[2]
        game_id = self.getCampaign(game_name)
        for script_name in sys.argv[3:]:
            print(f'Deleting {script_name}')
            script_id = self.getScript(game_id, script_name)
            self.sendDelete(game_name, script_name)
        print("Success")

    def reset(self):
        self.argsCheck("reset", 3)
        game_name = sys.argv[2]
        game_id = self.getCampaign(game_name)
        self.getScripts(game_id)
        for script_name in self.scripts:
            self.sendDelete(game_name, script_name)
        print("Success")

roll20 = Roll20()

if len(sys.argv)<2:
    print("Incorrect number of arguments\n")
    roll20.usage()
    exit()

if sys.argv[1] == "insertConfig":
    content = ConfigInserter().read(sys.argv[2])
    print (content)
    exit()

if sys.argv[1] == "authenticate":
    roll20.authenticate()
    exit()

if roll20.login() == False:
    print("Unable to login to Roll20")
    exit()

if sys.argv[1] == "upload":
    roll20.upload()
elif sys.argv[1] == "delete":
    roll20.delete()
elif sys.argv[1] == "reset":
    roll20.reset()
elif sys.argv[1] == "campaigns" or sys.argv[1] == "games":
    roll20.games()
elif sys.argv[1] == "game":
    if len(sys.argv)<4:
        print("Incorrect number of arguments\n")
        roll20.usage()
        exit()
    game = Game(sys.argv[2])
    cmd = sys.argv[3]
    args = sys.argv[4:]
    if cmd == "reset":
        game.reset(args)
    elif cmd == "add":
        game.add(args)

else:
    print("Unknown command")
    roll20.usage()
    exit()
