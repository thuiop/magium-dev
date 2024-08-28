#include <fstream>
#include <iostream>
#include <vector>
#include <utility>
#include <algorithm>
#include <regex>

std::vector<std::string> readFile(std::string filepath){
    std::ifstream content(filepath);
    if (!content.is_open())
        throw std::runtime_error("Could not open file, check directory again!");
    std::vector<std::string> buffer;
    std::string line;
    while (!content.eof()){
        std::getline(content, line);
        buffer.push_back(line);
    }
    content.close();

    return buffer;
}

std::string getID(std::string line){
    int pos = line.find("id");
    if (pos == line.npos)
        throw std::runtime_error("No ID found!");
    
    int colonPos = line.find(":", pos);
    int quotPos = line.find("\"", colonPos);
    int endQuotPos = line.find("\"", quotPos + 1);
    std::string id = line.substr(quotPos + 1, endQuotPos - quotPos - 1);

    return id;
}

void replaceString(std::string &str, const std::string &from, const std::string &to) {
    size_t pos = 0;
    while((pos = str.find(from, pos)) != std::string::npos) {
         str.replace(pos, from.length(), to);
         pos += to.length();
    }
}

std::string getText(std::string &line){
    int pos = line.find("text");
    if (pos == line.npos)
        throw std::runtime_error("No text Found!");
    
    int colonPos = line.find(":", pos);
    int quotStart = line.find("\"", colonPos);

    int quotEnd = quotStart;
    while (true){
        int possible = line.find("\"", quotEnd + 1);
        quotEnd = possible;
        if (line[possible - 1] != '\\'){
            break;
        }
    }
    std::string text = line.substr(quotStart + 1, quotEnd - quotStart - 1);

    replaceString(text, "<br/>", "\n");
    replaceString(text, "\\", "");
    replaceString(text, "%>", "");
    replaceString(text, "<% if", "#if");
    replaceString(text, " #if", "#if"); // remove space
    replaceString(text, "{", "{\n");
    replaceString(text, "}", "}\n");
    replaceString(text, " }\n", "}\n\n"); // remove space
    replaceString(text, " }\n\n\n", "}\n\n"); // more space removal
    replaceString(text, "<%", "");

    return text;
}

std::string getJsonContentsSeparator(std::string &str, std::string name, std::string sep, int &startPos){
    int pos = str.find(name, startPos);
    if (pos == str.npos){
        startPos = pos;
        return "";
    }
    int sepPos = str.find(sep, pos);
    int quotStart = str.find("\"", sepPos);
    int quotEnd = quotStart;
    while (true){
        quotEnd = str.find("\"", quotEnd + 1);
        if (str[quotEnd - 1] != '\\'){
            break;
        }
    }
    startPos = quotEnd + 1;
    return str.substr(quotStart + 1, quotEnd - quotStart - 1);
}

std::string getJsonContents(std::string &str, std::string name, int &startPos){
    return getJsonContentsSeparator(str, name, ":", startPos);
}

std::string getJsonContentsSetVariables(std::string &str, int startPos){
    startPos = str.find("set_variables", startPos);
    startPos += std::string("set_variables").size() + 3;
    std::vector<std::string> varList;
    std::vector<std::string> valList;
    int pos = startPos;
    int endPos = str.find("}", startPos);
    while (pos < endPos && pos != str.npos){
        pos = str.find("\"", pos);
        int endVarPos = str.find("\"", pos + 1);
        varList.push_back(str.substr(pos + 1, endVarPos - pos - 1));
        valList.push_back(getJsonContents(str, "\"", pos));
    }
    varList.pop_back(); // pop the npos
    valList.pop_back(); // pop the npos
    std::string variableString;
    for (int i = 0; i < varList.size(); i++){
        variableString += varList[i] + " = " + valList[i];
        if (i < varList.size() - 1)
            variableString += ", ";
    }
    return variableString;
}

std::string getChoice(std::string &str, int &startPos){
    std::string text = getJsonContents(str, "text", startPos);
    if (startPos == str.npos){
        return {};
    }
    std::string target = getJsonContents(str, "target", startPos);
    std::string setVariables = getJsonContentsSetVariables(str, startPos);

    std::string choice = "choice(\"" + text + "\", " + target + ", " + setVariables + ")";
    return choice;
}

std::vector<std::string> getChoices(std::string &str){
    std::vector<std::string> choices;
    int responsesPos = str.find("\"responses\":");
    if (responsesPos == str.npos)
        std::cout << "Warning: No choices attached\n";
    std::string choiceString = str.substr(responsesPos + 15);
    int startPos = 0;
    while (true){
        std::string choice = getChoice(choiceString, startPos);
        if (startPos == choiceString.npos)
            break;
        choices.push_back(choice);
    }
    return choices;
}

void outputMagiumFile(std::string &str){
    std::string id = getID(str);
    std::string text = getText(str);
    std::vector<std::string> choices = getChoices(str);

    std::ofstream outputFile(id + ".magium");
    
    outputFile << "Magium file\n\n";
    outputFile << "ID: " << id << '\n';
    outputFile << "TEXT:\n\n";
    outputFile << text << '\n';
    outputFile << "CHOICES:\n";
    for (std::string s : choices){
        outputFile << s << '\n';
    }

    outputFile.close();
}

int main(int argc, char* argv[]){
    if (argc <= 1)
        throw std::runtime_error("No file provided!");
    std::vector<std::string> buffer = readFile(argv[1]);

    std::string grouped;
    for (std::string s : buffer){
        grouped += s;
    }

    std::vector<int> starts;
    std::vector<int> ends;
    int currentPos = 0;
    while (currentPos != grouped.npos){
        starts.push_back(grouped.find("\"id\"", currentPos));
        ends.push_back(grouped.find(",", grouped.find("]", currentPos)));
        currentPos = grouped.find("\"id\"", currentPos + 2);
    }

    for (int i = 0; i < starts.size() - 1; i++){
        std::string str = grouped.substr(starts[i], ends[i] - starts[i] - 1);
        outputMagiumFile(str);
    }

}