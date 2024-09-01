from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass, field
from itertools import groupby
import json
import pathlib
import pprint
import re
from typing import Any
import warnings

root_folder = pathlib.Path("./chapters")
pp = pprint.PrettyPrinter(2)


class Lexer:
    def __init__(self,data):
        self.data = data
        self.pos = 0
        self.peek = data[0]

    def next(self):
        line = self.peek
        self.pos += 1
        self.peek = data[self.pos]
        return line

    def eof(self):
        return self.pos >= len(data) - 1


def is_condition(line):
    return line[0] in ["+","*"]

def transform_var_name(var_name):
    return "v_"+var_name.lower().replace(" ","_")

def parse_condition(t: str):
    if t in [">","<",">=","<="]:
        return t
    elif t == "=":
        return "=="
    elif t == "<>":
        return "!="
    else:
        raise ValueError(t)

def compare(value,comparison):
    return eval(f"{value} {parse_condition(comparison.type)} {comparison.value}")

def is_compatible(comp1,comp2):
    if comp1 is None or comp2 is None:
        return False
    if comp1.type == "=": 
        return compare(comp1.value,comp2)
    elif comp2.type == "=": 
        return compare(comp2.value,comp1)
    elif comp1 == comp2:
        return True
    elif comp1.type == "<" and comp2.type == ">" and comp2.value >= comp1.value-1:
        return False
    elif comp2.type == "<" and comp1.type == ">" and comp1.value >= comp2.value-1:
        return False
    elif comp1.type == ">=" and comp2.type == "<" and comp1.value >= comp2.value:
        return False
    elif comp2.type == ">=" and comp1.type == "<" and comp2.value >= comp1.value:
        return False
    elif comp1.type == ">=" and comp2.type == "<" and comp1.value < comp2.value:
        return False
    elif comp2.type == ">=" and comp1.type == "<" and comp2.value < comp1.value:
        return False
    elif comp1.type == "<" and comp2.type == "<" and comp1.value <= comp2.value:
        return True
    elif comp1.type == "<" and comp2.type == "<" and comp1.value > comp2.value:
        return False
    elif comp1.type == ">=" and comp2.type == ">=" and comp1.value >= comp2.value:
        return False
    elif comp1.type == ">=" and comp2.type == ">=" and comp1.value < comp2.value:
        return True
    elif comp1.type == "<" and comp2.type == ">=":
        return False
    else:
        raise ValueError(f"Do not know whether {comp1} and {comp2} are compatible")

def all_is_compatible(comp_set1,comp_set2):
    return all(is_compatible(comp_set1[key],comp_set2.get(key)) for key in comp_set1)

@dataclass
class Event:
    type: str = ""
    conditions: dict[str,Any] = field(default_factory=lambda:{"variables":{}})
    results: dict[str,Any] = field(default_factory=lambda:{"add_buttons":[],"set_variables":{},"paragraphs":[],"stat_checks":[]})


@dataclass
class Comparison:
    type: str
    value: int

@dataclass
class Paragraph:
    id: int
    version: int
    conditions: dict = field(default_factory=dict)

@dataclass
class ParagraphGroup:
    paragraphs: list[tuple[int,int]] = field(default_factory=list) # List of (id,version)
    conditions: dict = field(default_factory=dict)

@dataclass
class Response:
    text: str = field(default_factory=str)
    new_scene: str = field(default_factory=str)
    set_variables: dict = field(default_factory=dict)
    conditions: dict = field(default_factory=dict)
    special: str = ""

@dataclass
class SceneVariableSet:
    name: str
    value: int
    conditions: dict = field(default_factory=dict)

@dataclass
class StatsCheck:
    text: str
    successful: bool
    conditions: dict = field(default_factory=dict)

@dataclass
class Path:
    conditions: dict[str,Any]
    responses: list[Response]
    paragraphs: list[Paragraph]
    set_variables: list[SceneVariableSet]
    stat_checks: list[StatsCheck]

    def __repr__(self) -> str:
        text = "Path\n"
        text += f"\tConditions: {self.conditions}\n"
        text += f"\tParagraphs: {self.paragraphs}\n"
        text += f"\tResponses: {self.responses}\n"
        text += f"\tSet variables: {self.set_variables}\n"
        text += f"\tStat checks: {self.stat_checks}"
        return text


@dataclass
class Scene:
    id: str
    paths: list[Path] = field(default_factory=list) 
    paragraphs: list[Paragraph] = field(default_factory=list) 
    responses: list[Response] = field(default_factory=list) 
    set_variables: list[SceneVariableSet] = field(default_factory=list)
    stat_checks: list[StatsCheck] = field(default_factory=list) 

    def to_json(self,paragraphs):
        text = ""
        for stat_check in self.stat_checks:
            if stat_check.conditions != {}:
                condition_string = ' && '.join([f"(locals.{var} || 0) {parse_condition(cond.type)} {cond.value}" for var,cond in stat_check.conditions.items()])
                text += f"<% if({condition_string}) {{%>"
            text += f"<div class='stat_{'success' if stat_check.successful else 'fail'}'>{stat_check.text}</div>"
            if stat_check.conditions != {}:
                text += "<% } %>" #} (comment because vim is indent is messed  up)
        for par in self.paragraphs:
            if par.id not in paragraphs[par.version]:
                print(f"Paragraph {par.id} not found in {par.version}")
                continue
            if par.conditions != {}:
                condition_string = ' && '.join([f"(locals.{var} || 0) {parse_condition(cond.type)} {cond.value}" for var,cond in par.conditions.items()])
                text += f"<% if({condition_string}) {{%>"
            text += paragraphs[par.version][par.id]
            if par.conditions != {}:
                text += "<% } %>" #}
        text = re.sub(r"(\n){2,}", r"\n\n", text)
        text = text.replace("\n","<br/>")
        val = {
            "id": self.id,
            "text": text,
            "responses": [
                {
                    "text": response.text,
                    "target": response.new_scene,
                    "set_variables": response.set_variables,
                    "conditions": {var: {"type":parse_condition(condition.type),"value":condition.value} for var,condition in response.conditions.items()},
                    "special": response.special,
                }
                for response in self.responses
            ],
            "set_variables": [
                {
                    "name": set_variable.name,
                    "value": set_variable.value,
                    "conditions": {var: {"type":parse_condition(condition.type),"value":condition.value} for var,condition in set_variable.conditions.items()},
                }
                for set_variable in self.set_variables
            ]
        }
        return val

    def to_magium(self,paragraphs):
        text = f"ID: {self.id}\nTEXT: \n\n"

        for set_variable in self.set_variables:
            text += f'set({set_variable.name},{set_variable.value})'
            if set_variable.conditions != {}:
                text += f' if ({" && ".join([f"{var} {parse_condition(condition.type)} {condition.value}" for var, condition in set_variable.conditions.items()])})'
            text += "\n"
        for stat_check in self.stat_checks:
            stat_check_text = stat_check.text.replace('\n','')
            text += f"{'SUCCESS:' if stat_check.successful else 'FAIL:'}{stat_check_text}"
            if stat_check.conditions != {}:
                condition_string = ' && '.join([f"{var} {parse_condition(cond.type)} {cond.value}" for var,cond in stat_check.conditions.items()])
                text += f" if ({condition_string})"
            text += "}\n"

        paragraph_groups = self.merge_paragraphs()
        for par_group in paragraph_groups:
            if par_group.conditions != {}:
                condition_string = ' && '.join([f"{var} {parse_condition(cond.type)} {cond.value}" for var,cond in par_group.conditions.items()])
                text += f"#if({condition_string}) {{\n"
            for par_tuple in par_group.paragraphs:
                if par_tuple[0] not in paragraphs[par_tuple[1]]:
                    print(f"Paragraph {par_tuple[0]} not found in {par_tuple[1]}")
                    continue
                text += paragraphs[par_tuple[1]][par_tuple[0]]
            if par_group.conditions != {}:
                text += "}\n" #}
        text = re.sub(r"(\n){2,}", r"\n\n", text)

        for response in self.responses:
            text += f'choice("{response.text}", {response.new_scene}, {", ".join([f"{name} = {value}" for name,value in response.set_variables.items()])}'
            if response.special != "":
                 text += f", special:{response.special}"
            text += ")"
            if response.conditions != {}:
                text += f' if ({" && ".join([f"{name} {parse_condition(cond.type)} {cond.value}" for name,cond in response.conditions.items()])})' 
            text += "\n"

        return text

    def merge_paragraphs(self):
        paragraph_groups = {}
        for paragraph in self.paragraphs:
            key = str(paragraph.conditions) 
            if key not in paragraph_groups:
                paragraph_groups[key] = ParagraphGroup(conditions=paragraph.conditions)
            paragraph_groups[key].paragraphs.append((paragraph.id,paragraph.version))
        return paragraph_groups.values()



        



class Parser:
    def __init__(self, lexer) -> None:
        self.lexer = lexer

    def parse_event(self):
        assert self.lexer.peek.startswith("*")
        event = Event()
        while len(current:=self.lexer.next()) > 1 and not self.lexer.eof():
            if is_condition(current):
                if match := re.search('current scene = "(?P<scene>.*)"',current):
                    event.conditions["scene"] = match.group("scene")
                elif match := re.search('current scene <> "(?P<scene>.*)"',current):
                    continue
                elif "Mouse pointer is over" in current:
                    event.type = "button"
                elif match := re.search('Button ID of Group.Buttons = (?P<button>.*)',current):
                    event.conditions["button_id"] = int(match.group("button"))-1
                elif match := re.search('(?P<variable>.*) (?P<comparison>=|<|>|<>|>=|<=) (?P<value>.*)',current[2:]):
                    if "counter" not in match.group("variable").lower():
                        event.conditions["variables"][transform_var_name(match.group("variable"))] = Comparison(match.group("comparison"),int(match.group("value")))

            else:
                if match := re.search('List : Add line "(?P<button_name>.*)"',current):
                    event.type = "scene_load"
                    event.results["add_buttons"].append(match.group("button_name"))
                elif match := re.search('Special : Set current scene to "(?P<scene>.*)"',current):
                    event.results["new_scene"] = match.group("scene")
                    event.results["set_variables"][transform_var_name("current scene")] = match.group("scene")
                elif match := re.search('Special : Set chapter save to 1',current):
                    event.results["special"] = "checkpoint_save"
                elif match := re.search('Special : Set chapter load to 1',current):
                    event.results["special"] = "checkpoint_load"
                elif match := re.search('Special : Set (?P<variable>.*) to (?P<value>.*)',current):
                    event.results["set_variables"][transform_var_name(match.group("variable"))] = match.group("value")
                elif match := re.search('Special : Add (?P<value>.*) to (?P<variable>.*)',current):
                    event.results["set_variables"][transform_var_name(match.group("variable"))] = "+"+match.group("value")
                elif match := re.search('Scene text : Display paragraph (?P<paragraph>.*)',current):
                    event.results["paragraphs"].append((int(match.group("paragraph")),1))
                elif match := re.search('Scene text 2 : Display paragraph (?P<paragraph>.*)',current):
                    event.results["paragraphs"].append((int(match.group("paragraph")),2))
                elif match := re.search('scene 3 : Display paragraph (?P<paragraph>.*)',current):
                    event.results["paragraphs"].append((int(match.group("paragraph")),3))
                elif match := re.search('checks : Set alterable string to (?P<text>.*)',current):
                    for stat_check in re.findall('"\[.*?\]"',match.group("text")):
                        event.results["stat_checks"].append(StatsCheck(stat_check.replace('"',"")+"\n","successful" in stat_check))
                    if "Checkpoint reached" in match.group("text"):
                        event.results["stat_checks"].append(StatsCheck("Checkpoint reached: Game saved.",True))
                        event.type = "scene_load"
                elif match := re.search('storyboard controls : Jump to frame "Stats"',current):
                    event.results["special"] = "stats"
                elif match := re.search('storyboard controls : Jump to frame "Save load game"',current):
                    if event.results.get("special","") == "":
                        event.results["special"] = "saves"
                elif match := re.search('Achievement title : Set alterable string to "(?P<achievement>.*)"',current):
                    achievement_var = [var for var in event.conditions["variables"] if "_ac_" in var][0]
                    event.results["special"] = f"achievement-{match.group('achievement')}-{achievement_var}"
                    event.conditions["variables"] = {var:condition for var, condition in event.conditions["variables"].items() if "_ac_" not in var}
                    

        return event

    def parse(self):
        events = []
        while not self.lexer.eof():
            while not self.lexer.peek.startswith("*") and not self.lexer.eof():
                self.lexer.next()
            events.append(self.parse_event())
        return events
            

chapters = (
    [f"ch{num}" for num in list(range(1,11))+["11a","11b"]]
    + [f"b2ch{num}" for num in [1,2,3,"4a","4b","5a","5b",6,7,8,"9a","9b","10a","10b","11a","11b","11c"]]
    + [f"b3ch{num}" for num in [1,"2a","2b","2c","3a","3b","4a","4b","5a","5b","6a","6b","6c","7a","8a","8b","9a","9b","9c","10a","10b","10c","11a","12a","12b"]]
)
verbose = False
for chapter in chapters:
    filename = root_folder/chapter/"logic.txt"

    events = []
    current_event = {}
    with open(filename,"r") as f:
        data = list(f.readlines())
    lexer = Lexer(data)
    parser = Parser(lexer)

    events = parser.parse()
    scenes = {}

    for event in [e for e in events if e.type == "scene_load"]:
        if verbose:
            print(event)
        if "scene" not in event.conditions:
            print("No scene specified...")
            continue
        scene_id = event.conditions["scene"]
        if scene_id not in scenes:
            scenes[scene_id] = Scene(scene_id)

        scenes[scene_id].paths.append(Path(
            conditions=event.conditions["variables"],
            responses=[Response(button) for button in event.results["add_buttons"]],
            paragraphs=[Paragraph(paragraph[0],paragraph[1]) for paragraph in event.results["paragraphs"]],
            set_variables=[SceneVariableSet(variable,int(value)) for variable, value in  event.results["set_variables"].items()],
            stat_checks=event.results["stat_checks"],
        ))

    for event in [e for e in events if e.type == "button"]:
        if verbose:
            print("#"*60)
            print(event)
        if "scene" not in event.conditions:
            print("No scene specified...")
            continue
        scene_id = event.conditions["scene"]
        if scene_id not in scenes:
            raise ValueError(f"The scene '{scene_id} was not found ! List of available scenes : {' '.join(scenes.keys())}'")


        set_variable_names = []
        for path in scenes[scene_id].paths:
            for set_variable in path.set_variables:
                set_variable_names.append(set_variable.name)
        for path in scenes[scene_id].paths:
            for set_variable_name in set_variable_names:
                if set_variable_name not in [v.name for v in path.set_variables]:
                    path.set_variables.append(SceneVariableSet(set_variable_name,0))

        event_conditions = event.conditions["variables"]
        for path in scenes[scene_id].paths:
            if verbose:
                print(path)
                print("Event conditions:",event_conditions)
                print("Button id:",event.conditions["button_id"])
            fake_scene_conditions = (
                path.conditions
                | {scene_set_variable.name: Comparison("=",scene_set_variable.value) for scene_set_variable in path.set_variables}
                #| {scene_set_variable_name: Comparison("=",0) for scene_set_variable_name in set_variable_names if scene_set_variable_name not in [v.name for v in path.set_variables]}
            )

            unrelated_conditions = {}
            for var,condition in event_conditions.items():
                if var not in fake_scene_conditions:
                    unrelated_conditions[var] = condition
            for var,condition in unrelated_conditions.items():
                fake_scene_conditions[var] = condition
            if verbose:
                if len(unrelated_conditions):
                    print("There are unrelated conditions:",unrelated_conditions)


            if not all_is_compatible(event_conditions,fake_scene_conditions) or path.responses==[]:
                if verbose:
                    print("Not compatible")
                continue


            if event.conditions["button_id"] >= len(path.responses):
                warnings.warn(f"Button id {event.conditions['button_id']} was not found !")
                continue
            response = path.responses[event.conditions["button_id"]]

            if len(unrelated_conditions):
                new_path = Path({},[],[],[],[])
                new_path.conditions = deepcopy(path.conditions) | event_conditions
                response = deepcopy(response)
                new_path.responses.append(response)
                scenes[scene_id].paths.append(new_path)
                if verbose:
                    print("Creating a fake path...")
                    print(new_path)

            if verbose:
                print("Chosen response:",response)

            for var,value in event.results["set_variables"].items():
                response.set_variables[var] = value 
            if scene_id == "Ch11b-Ending":
                response.set_variables["v_first_book_purchased"] = "1"
            if scene_id == "B2-Ch11c-Ending":
                response.set_variables["v_second_book_purchased"] = "1"
                
            if "new_scene" in event.results: 
                response.new_scene = event.results["new_scene"]

            if "special" in event.results and response.special == "":
                response.special = event.results["special"]
            elif response.text == "Restart game":
                response.special = "restart" 

            if verbose:
                print("New response:",response)
                print()

    for scene in scenes.values():
        for path in scene.paths:
            for element_type in ["paragraphs","stat_checks","responses","set_variables"]:
                for element in getattr(path,element_type):
                    element.conditions = path.conditions
                    getattr(scene,element_type).append(element)
            scene.responses = [response for response in scene.responses if response.new_scene != "" or response.special != ""]


    paragraphs = {1:{},2:{},3:{}}

    for i in [1,2,3]:
        print(chapter,i)
        print(root_folder/chapter/f"paragraphs{i}.txt")
        try:
            with open(root_folder/chapter/f"paragraphs{i}.txt","r") as f:
                data = f.readlines()
        except Exception:
            with open(root_folder/chapter/f"paragraphs{i}.txt","r",encoding="utf16") as f:
                data = f.readlines()

        current_par_index = 0
        current_par = ""
        for line in data:
            if match := re.match("\[(?P<par_num>[0-9]*)\](?P<text>.*)",line):
                paragraphs[i][current_par_index] = current_par
                current_par = match.group("text")
                current_par_index = int(match.group("par_num"))
            else:
                current_par += line
        paragraphs[i][current_par_index] = current_par

    json_vals = {id:scene.to_json(paragraphs) for id,scene in scenes.items()}
    with open(root_folder/f"{chapter}.json","w") as f:
        json.dump(json_vals,f,indent=4)

    magium_vals = "\n\n".join(scene.to_magium(paragraphs) for scene in scenes.values())
    with open(root_folder/f"{chapter}.magium","w") as f:
        f.write(magium_vals) 

@dataclass
class Achievement:
    title: str
    caption: str
    chapter: str
    variable: str = ""

class AchievementParser:
    def __init__(self, lexer) -> None:
        self.lexer = lexer
        self.achievements = defaultdict(list)

    def parse_event(self):
        assert self.lexer.peek.startswith("*")
        current_achievement = {}
        current_chapter = ""
        current_achievement_id = 0
        current_achievement_var = ""
        while len(current:=self.lexer.next()) > 1 and not self.lexer.eof():
            if is_condition(current):
                if match := re.search('achievement chapter = (?P<chapter>.*)',current):
                    current_chapter = match.group("chapter")
                elif match := re.search('Button ID of Button = (?P<button_id>.*)',current):
                    current_achievement_id = int(match.group("button_id")) - 1
                elif match := re.search('(?P<achievement_id>AC .*) = 1',current):
                    current_achievement_var = transform_var_name(match.group("achievement_id"))
            else:
                if match := re.search('List1 : Add line "(?P<achievement_title>.*)"',current):
                    current_achievement["title"] = match.group("achievement_title")
                elif match := re.search('List2 : Add line "(?P<achievement_caption>.*)"',current):
                    current_achievement["caption"] = match.group("achievement_caption")
                    self.achievements[current_chapter].append(Achievement(current_achievement["title"],current_achievement["caption"],current_chapter))
                elif match := re.search('Active 2 : Make invisible',current):
                    self.achievements[current_chapter][current_achievement_id].variable = current_achievement_var

    def parse(self):
        while True:
            while not self.lexer.peek.startswith("*") and not self.lexer.eof():
                self.lexer.next()
            if self.lexer.eof():
                break
            self.parse_event()
        return self.achievements

def chapter_name(id,book):
    return f"b{book}ch{id}"

for i in range(1,4):
    with open(f"chapters/achievements_logic{i}.txt","r") as f:
        data = f.readlines()

    lexer = Lexer(data)
    parser = AchievementParser(lexer)
    achievements = parser.parse()
    achievements_list = []
    for achievement_group in achievements.values():
        achievements_list += achievement_group
    achievements_json = [
        {
            "title": achievement.title,
            "caption": achievement.caption,
            "chapter": chapter_name(achievement.chapter,i),
            "variable": achievement.variable
        }
        for achievement in achievements_list
    ]

    achievements_json = {k: list(v) for k, v in groupby(achievements_json,key=lambda a:a["chapter"])}
    with open(root_folder/f"achievements{i}.json","w") as f:
        json.dump(achievements_json,f,indent=4)
