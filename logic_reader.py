from collections import defaultdict
from dataclasses import dataclass, field
from itertools import groupby
import json
from pathlib import Path
import re
from typing import Any

root_folder = Path("./chapters")


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
class Scene:
    id: str
    paragraphs: list = field(default_factory=list) 
    responses: list = field(default_factory=list) 
    set_variables: list = field(default_factory=list)
    stat_checks: list = field(default_factory=list) 

    def to_json(self,paragraphs):
        text = ""
        for stat_check in self.stat_checks:
            if stat_check.conditions != {}:
                condition_string = ' && '.join([f"(locals.{var} || 0) {parse_condition(cond.type)} {cond.value}" for var,cond in stat_check.conditions.items()])
                text += f"<% if({condition_string}) {{%>"
            text += f"<div class='stat_{'success' if stat_check.successful else 'fail'}'>{stat_check.text}</div>"
            if stat_check.conditions != {}:
                text += "<% } %>"
        for par in self.paragraphs:
            if par.conditions != {}:
                condition_string = ' && '.join([f"(locals.{var} || 0) {parse_condition(cond.type)} {cond.value}" for var,cond in par.conditions.items()])
                text += f"<% if({condition_string}) {{%>"
            text += paragraphs[par.version][par.id]
            if par.conditions != {}:
                text += "<% } %>"
        text = re.sub(r"(\n){2,}", r"\n\n", text)
        text = text.replace("\n","<br/>")
        val = {
            "id": self.id,
            "text": text,
            "responses": [
                {
                    "code": response.text,
                    "text": response.text,
                    "target": response.new_scene,
                    "set_variables": response.set_variables,
                    "conditions": {var: {"type":parse_condition(condition.type),"value":condition.value} for var,condition in response.conditions.items()},
                    "special": response.special,
                }
                for response in self.responses
            ]
        }
        return val


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
                    event.results["special"] = f"achievement-{match.group('achievement')}"
                    

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
)
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
        print(event)
        if "scene" not in event.conditions:
            continue
        scene = event.conditions["scene"]
        if scene not in scenes:
            scenes[scene] = Scene(scene)

        for button in event.results["add_buttons"]:
            scenes[scene].responses.append(Response(button,conditions=event.conditions["variables"]))
        for paragraph in event.results["paragraphs"]:
            scenes[scene].paragraphs.append(Paragraph(paragraph[0],paragraph[1],event.conditions["variables"])) 
        for variable, value in  event.results["set_variables"].items():
            scenes[scene].set_variables.append(SceneVariableSet(variable,int(value),event.conditions["variables"])) 
        for stat_check in event.results["stat_checks"]:
            stat_check.conditions = event.conditions["variables"]
            scenes[scene].stat_checks.append(stat_check)


    for event in [e for e in events if e.type == "button"]:
        print("#"*60)
        print(event)
        if "scene" not in event.conditions:
            continue
        scene = event.conditions["scene"]
        if scene not in scenes:
            raise ValueError(f"The scene '{scene} was not found ! List of available scenes : {' '.join(scenes.keys())}'")
        event_conditions = event.conditions["variables"]
        conditions_transform = defaultdict(list)
        for scene_variable_set in scenes[scene].set_variables:
            conditions_transform[scene_variable_set.name].append((scene_variable_set.value,scene_variable_set.conditions))

        print(*scenes[scene].responses,sep="\n")
        def is_visible(response):
            if response.conditions == {}:
                return True
            variables = {var: val for var,val in event.conditions["variables"].items() if "_ac_" not in var}
            to_remove = []
            for var, condition in variables.items():
                if var not in conditions_transform:
                    continue
                # If one of the conditions to setting the variable to the required value is satisfied
                # OR if all the conditions to setting the variable to an incompatible value are NOT satisfied
                condition_validated = (
                    any(ls:=[all_is_compatible(cond[1],response.conditions) for cond in conditions_transform[var] if compare(cond[0],condition)])
                    or (all(ls:=[not all_is_compatible(cond[1],response.conditions) for cond in conditions_transform[var] if not compare(cond[0],condition)]) and ls != [])
                )
                # If none of the conditions for setting the variable to the correct value are satisfied
                # OR if one of the conditions for setting the variable to an incompatible value is satisfied
                condition_invalidated = (
                    (all(ls:=[not all_is_compatible(cond[1],response.conditions) for cond in conditions_transform[var] if compare(cond[0],condition)]) and ls != [])
                    or any(ls:=[all_is_compatible(cond[1],response.conditions) for cond in conditions_transform[var] if not compare(cond[0],condition)])
                )
                if condition_validated:
                    to_remove.append(var)
                elif condition_invalidated:
                    return False
                
            for var in to_remove:
                del variables[var]
            variables = {var: val for var,val in event.conditions["variables"].items() if not all([var not in response.conditions for response in scenes[scene].responses])}
                    
            return all_is_compatible(variables,response.conditions)
        visible_responses = [response for response in scenes[scene].responses if is_visible(response)]
        response = visible_responses[event.conditions["button_id"]]

        for var,value in event.results["set_variables"].items():
            response.set_variables[var] = value 
            
        if "new_scene" in event.results: 
            response.new_scene = event.results["new_scene"]

        if "special" in event.results:
            response.special = event.results["special"]

        # Handle case where the buttons are identical for different versions of the scene
        for other_response in scenes[scene].responses:
            if response.text == other_response.text:
                for var,value in event.results["set_variables"].items():
                    other_response.set_variables[var] = value 
                    
                if "new_scene" in event.results: 
                    other_response.new_scene = event.results["new_scene"]

                if "special" in event.results:
                    other_response.special = event.results["special"]


    for id,scene in scenes.items():
        print(id)
        print(scene)


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
