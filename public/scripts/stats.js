// Check if some of the stats are undefined.
// If they are, update every stat cookie with the default value 0, and reload the page.

// This can be moved to a global variable later on, but recommendation would be to keep this in frontend
var stats_variables = ["v_available_points", "v_strength", "v_toughness", "v_agility", "v_reflexes",
    "v_hearing", "v_perception", "v_ancient_languages", "v_combat_technique", "v_premonition",
    "v_bluff", "v_magical_sense", "v_aura_hardening", "v_magical_power", "v_magical_knowledge",
    "v_max_stat"]

var getCookies = function(){
  var pairs = document.cookie.split(";");
  var cookies = {};
  for (var i=0; i<pairs.length; i++){
    var pair = pairs[i].split("=");
    cookies[(pair[0]+'').trim()] = unescape(pair.slice(1).join('='));
  }
  return cookies;
}

var locals = getCookies()

"DOMContentLoaded htmx:afterSwap".split(" ").forEach(function(e){
    document.addEventListener(e, function() {
        var stats_missing = stats_variables.some(function(stat) {
            var value = locals[stat];
            return value === null || value === undefined;
        });

        if (stats_missing) {
            stats_variables.forEach(function(stat) {
                if (stat == 'v_max_stat') {
                    document.cookie = stat + "=3";
                } else {
                    document.cookie = stat + "=0";
                }
                // Temporary points
                if (stat == 'v_available_points') {
                    document.cookie = stat + "=30";
                }
            });
            window.location.reload();
        }
    })
})

// Logic for updating stats

// Define temporary global variables for the stats
// Can also later set up two-way binding directly with the HTML elements using Object.defineProperty
function getAuxiliaryStats() {
    // The following code is a more flexible version. It can be used if deemed more appropriate.
    // TODO: Have a discussion on whether this may be the better approach
    // function initializeAuxiliaryProperty(stat_property) {
    //     var stat_value = locals[stat_property] ? locals[stat_property] : default_value;
    //     return stat_value;
    // }
    // var stats_aux = {}
    // for (stat of stats_variables) {
    //     stats_aux[stat + "_aux"] = initializeAuxiliaryProperty(stat);
    // }
    // delete stats_aux["v_max_stat_aux"];

    function initializeAuxiliaryProperty(stat_property, default_value) {
        var stat_value = locals[stat_property] && !Number.isNaN(locals[stat_property]) ? 
            parseInt(locals[stat_property]) : 0;
        return stat_value;
    }
    var stats_aux = {
        "v_available_points_aux": initializeAuxiliaryProperty("v_available_points", 0),
        "v_strength_aux": initializeAuxiliaryProperty("v_strength", 0),
        "v_toughness_aux": initializeAuxiliaryProperty("v_toughness", 0),
        "v_agility_aux": initializeAuxiliaryProperty("v_agility", 0),
        "v_reflexes_aux": initializeAuxiliaryProperty("v_reflexes", 0),
        "v_hearing_aux": initializeAuxiliaryProperty("v_hearing", 0),
        "v_perception_aux": initializeAuxiliaryProperty("v_perception", 0),
        "v_ancient_languages_aux": initializeAuxiliaryProperty("v_ancient_languages", 0),
        "v_combat_technique_aux": initializeAuxiliaryProperty("v_combat_technique", 0),
        "v_premonition_aux": initializeAuxiliaryProperty("v_premonition", 0),
        "v_bluff_aux": initializeAuxiliaryProperty("v_bluff", 0),
        "v_magical_sense_aux": initializeAuxiliaryProperty("v_magical_sense", 0),
        "v_aura_hardening_aux": initializeAuxiliaryProperty("v_aura_hardening", 0),
        "v_magical_power_aux": initializeAuxiliaryProperty("v_magical_power", 0),
        "v_magical_knowledge_aux": initializeAuxiliaryProperty("v_magical_knowledge", 0),
    }
    return stats_aux;
}

// This function is called on page load to initialize the stats
// As well as to update when Cancel Changes is clicked
// Unlike getAuxiliaryStats, this function is implemented in a flexible manner, instead of hard-coding
//  For example: notice the calculation of stat, stat_value, stat_field_id, stat_value_span_id
// TODO: Have a discussion on whether this may be too flexible and if it is better to hard-code the stats
function initializeStats(stats_aux, reset_magic_stats = true) {
    for (var stat_aux in stats_aux) {
        if (!reset_magic_stats && 
        (stat_aux === "v_magical_power_aux" || stat_aux === "v_magical_knowledge_aux")) {
            continue;
        }
        var stat = stat_aux.split("_aux")[0];
        var stat_value = stats_aux[stat_aux];
        var stat_field_id = stat.split("v_")[1];
        var stat_value_span_id = stat_field_id + "_value";
        if (document.getElementById(stat_value_span_id) === null) {continue;}
        document.getElementById(stat_value_span_id).innerHTML = stat_value;
        document.getElementById(stat_field_id).className = "stat-field" + 
            (stat === "v_available_points" ? " available" : "") +
            (stat === "v_magical_power" || stat === "v_magical_knowledge" ? " magic-special" : "");
    }
}

var stats_aux = getAuxiliaryStats();
initializeStats(stats_aux);
var stats_changed = false; // This variable is used to check if the stats have been changed

function updateStat(stat, stat_aux_key, stat_field_id, stat_field_value_id) {
    var stat_aux_value = stats_aux[stat_aux_key];
    var stat_max = locals["v_max_stat"];
    var available_points = stats_aux["v_available_points_aux"];

    if ((stat_aux_value >= stat_max) || (available_points <= 0)) { return; }
    stats_aux[stat_aux_key] += 1;
    stats_aux["v_available_points_aux"] -= 1;
    document.getElementById("available_points_value").innerHTML = stats_aux["v_available_points_aux"];
    document.getElementById(stat_field_value_id).innerHTML = stats_aux[stat_aux_key];
    document.getElementById(stat_field_id).className = "stat-field updated";
    stats_changed = true;
}

function confirmStats() {
    if (!stats_changed) { return; }
    // Update the stats cookies
    for (var stat_aux in stats_aux) {
        var stat = stat_aux.split("_aux")[0];
        document.cookie = stat + "=" + stats_aux[stat_aux];
    }
    // Refresh the page to reflect the changes
    window.location.reload();
}

