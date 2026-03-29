const ejs = require("ejs");

// List of stat variables ; used to check which variables should trigger a stat check display
const stats_variables = [
    "v_strength",
    "v_toughness",
    "v_agility", // Speed
    "v_reflexes",
    "v_hearing",
    "v_perception", // Observation
    "v_ancient_languages",
    "v_combat_technique",
    "v_premonition",
    "v_bluff",
    "v_magical_sense",
    "v_aura_hardening",
    "v_magical_power", // Currently, not utilized
    "v_magical_knowledge", // Currently, not utilized
];

/** Builds the header text from the scene id. This leverages a header template
 * defined for each locale.
 *
 * @param {str} sceneId - Id of the relevant scene. Should look like "B2-Ch07a-Intro".
 * @param {string} headerTemplate - EJS template representing the header text. Should have fields "book" and "chapter".
 * @returns {string} Header text. In English, this looks like "Book X - Chapter Y".
 * */
function getHeaderFromId(sceneId, headerTemplate) {
    const regex = /(B(?<book>[0-9]*)-)?Ch(?<chapter>[0-9]*)[a-c]?-.*$/;
    let result = regex.exec(sceneId)
    if (result) {
        let book = result.groups["book"] ? result.groups["book"] : "1";
        let chapter = parseInt(result.groups["chapter"]);
        return ejs.render(headerTemplate, { "book": book, "chapter": chapter })
    }
}

/** Retrieves all the data associated to a given locale.
 *
 * @param {Object.<string, Object>} fullData - Object indexed by the locale keys; each field should in turn be an Object. This is normally imported from the data/<lang>/ui.json files.
 * @param {string} localeKey - Locale key. Will default to "en" if undefined.
 * @returns {Object} All data associated to the given locale.
 * */
function getLocaleData(fullData, localeKey) {
    let locale = localeKey ? localeKey : "en"
    return Object.assign({}, fullData[locale])
}

/** Computes whether a condition evaluates to true or false 
 * @param {string} entry - String representing the condition, e.g. "v_perception > 2" 
 * @param {Object.<string, number>} values - Object containing the values of the different variables; is used to query the value of the variable the condition is about 
 * @returns {boolean}
 * */
function apply_condition(entry, values) {
    if (!entry) {
        return true;
    }
    let match;
    if (entry == "True") {
        return true;
    } else if (
        (match = entry.match(
            /(?<varName>\w*) (?<condType><|>|>=|==|<=|!=) (?<value>[0-9]+)/,
        ))
    ) {
        var variable = match.groups.varName;
        var condType = match.groups.condType;
        var value = parseInt(match.groups.value);
        switch (condType) {
            case ">": return (values[variable] || 0) > value;
            case "<": return (values[variable] || 0) < value;
            case "<=": return (values[variable] || 0) <= value;
            case ">=": return (values[variable] || 0) >= value;
            case "!=": return (values[variable] || 0) != value;
            case "==": return (values[variable] || 0) == value;
        }
    } else {
        console.log("Condition fail");
        console.log(entry);
        return;
    }
}

/** Computes whether a collection of conditions evaluates to true or false.
 * It is assumed that the conditions are stored as an array of arrays, representing the DNF ("OR of ANDS") of the full condition. That is, every inner array represents an AND of all the conditions is contained, while the outer array is an OR.
 * @param {Array.<Array.<string>>} conditions - Array of array representing the conditions as described above.
 * @param {Object.<string, number>} values - Object containing the values of the different variables; is used to query the value of the variable the condition is about 
 * @returns {boolean}
 * */
function apply_conditions(conditions, values) {
    return (
        !conditions ||
        conditions.some((conds) =>
            conds.every((cond) => apply_condition(cond, values)),
        )
    );
}

/** Capitalizes the first letter of the given string
 *
 * @param {string} val - String to capitalize
 * @returns {string} Capitalized string
 *
 * */
function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

/** Transforms the name of a stat variable to the key used to access the localeData.
 *
 * @param {string} varName - Name of the stat variable, e.g "v_premonition"
 * @returns {string} Key of the stat in the localeData, e.g statsPremonitionText
 * */
function varToStat(varName) {
    let statName;
    if (varName == "v_agility") {
        statName = "Speed";
    }
    else if (varName == "v_perception") {
        statName = "Observation";
    } else {
        statName = (
            varName.slice(2).split("_").map(capitalizeFirstLetter).join("")
        );
    }
    return "stats" + statName + "Text";
}

/** Parses a string representing a stat check. 
 * This is specifically made to get the needed representation of the stat check string; choices depending on the stat check are handled by apply_condition(s). It returns undefined if given a condition that is not on a stat variable. Here it is assumed that the given condition is true.
 *
 * @param {string} condition - String representing the condition, e.g. "v_perception > 2".
 * @returns {{ variable: string, value: number, success: boolean}}
 * */
function parseStatCheck(condition) {
    let match;
    if (
        (match = condition.match(
            /(?<varName>\w*) (?<condType><|>|>=|==|<=|!=) (?<value>[0-9]+)/,
        ))
    ) {
        var variable = match.groups.varName;
        var condType = match.groups.condType;
        var value = parseInt(match.groups.value);
    } else {
        console.log("Stat check parsing fail");
        console.log(condition);
        return;
    }
    // Handle the case where you lock your stat device at the beginning of book 3
    if (variable === "v_b3_ch1_unlock" && condType === "==" && value === 2) {
        return { variable: variable, value: value, success: false }
    }
    if (!stats_variables.includes(variable)) {
        return;
    }

    let success;
    if (condType == "<") {
        success = false;
    } else if (condType == "==" && value == 0) {
        success = false;
        value = 1;
    } else if (condType == ">=" || (condType == "==" && value != 0)) {
        success = true;
    } else if (condType == ">") {
        success = true;
        value += 1;
    } else {
        console.log("Unmatched condition type", condType);
    }
    return { variable: varToStat(variable), value: value, success: success };
}

/** Extracts the stats check from the variables set by the scene.
 *
 * @param {Array.<Object>} setVariables - 
 * @param {Object.<string, number>} values - Actual values of the variables. Used to check which set variables should be considered.
 * @param {Object.<string, string>} localeData - Locale data, as can be obtained with getLocaleData.
 * */
function statChecksToDisplay(setVariables, values, localeData) {
    let newStatChecks = [];
    let setVariable;
    for (setVariable of setVariables) {
        if (!setVariable.conditions) {
            continue;
        } else {
            let conditionGroups = setVariable.conditions.filter((conds) =>
                conds.every((cond) => apply_condition(cond, values)),
            );
            let conditionGroup, condition, statCheck;
            for (conditionGroup of conditionGroups) {
                for (condition of conditionGroup) {
                    if ((statCheck = parseStatCheck(condition))) {
                        statCheck.variable = statCheck.variable == "v_b3_ch1_unlock" ? statCheck.variable : localeData[statCheck.variable];
                        newStatChecks.push(JSON.stringify(statCheck));
                    }
                }
            }
        }
    }
    newStatChecks = [...new Set(newStatChecks)].map(JSON.parse);
    // If stat device locked, do not display other checks
    if (newStatChecks.some((statCheck) => statCheck.variable == "v_b3_ch1_unlock")) {
        newStatChecks = newStatChecks.filter((statCheck) => statCheck.variable == "v_b3_ch1_unlock")
    }
    return newStatChecks
}


module.exports = {
    capitalizeFirstLetter,
    getHeaderFromId,
    getLocaleData,
    apply_conditions,
    statChecksToDisplay,
    varToStat,
};
