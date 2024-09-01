// setup.js
const ejs = require('ejs');
const path = require('path');


const stats_variables = [
    "v_available_points",
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
    "v_max_stat"
]

/// ---

let json_data = {}
const chapters = (
    ["ch1","ch2","ch3","ch4","ch5","ch6","ch7","ch8","ch9","ch10","ch11a","ch11b",
        'b2ch1', 'b2ch2', 'b2ch3', 'b2ch4a', 'b2ch4b', 'b2ch5a', 'b2ch5b', 'b2ch6', 'b2ch7','b2ch8', 'b2ch9a', 'b2ch9b', 'b2ch10a', 'b2ch10b', 'b2ch11a', 'b2ch11b', 'b2ch11c',
        'b3ch1', 'b3ch2a', 'b3ch2b', 'b3ch2c', 'b3ch3a', 'b3ch3b', 'b3ch4a', 'b3ch4b', 'b3ch5a', 'b3ch5b', 'b3ch6a', 'b3ch6b', 'b3ch6c', 'b3ch7a', 'b3ch8a', 'b3ch8b', 'b3ch9a', 'b3ch9b', 'b3ch9c', 'b3ch10a', 'b3ch10b', 'b3ch10c', 'b3ch11a', 'b3ch12a', 'b3ch12b']
)


module.exports = {
    stats_variables,
    json_data,
    chapters
}
