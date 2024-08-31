function getDefaultStatsVariables() {
    var stats_variables = ["v_available_points", "v_strength", "v_toughness", "v_agility", "v_reflexes",
        "v_hearing", "v_perception", "v_ancient_languages", "v_combat_technique", "v_premonition",
        "v_bluff", "v_magical_sense", "v_aura_hardening", "v_magical_power", "v_magical_knowledge",
        "v_max_stat"]
    return stats_variables;
}

// Can be used in event listeners of the stat page to handle missing stats
// saveCallback: To save the missing stat variable in the local object. E.g. Saving a cookie: storeItem
// handleCallback: Optional callback in case there is some update that needs to be run after all the saves 
function handleMissingStats(locals, saveCallback, updateCallback) {
    if (!saveCallback) {
        console.log('Save Callback is required')
        return;
    }
    var stats_missing = stats_variables.some(function(stat) {
        var value = locals[stat];
        return value === null || value === undefined;
    });

    if (stats_missing) {
        stats_variables.forEach(function(stat) {
            if (stat == 'v_max_stat') {
                saveCallback(stat, "3");
            } else {
                saveCallback(stat, "0");
            }
            // Temporary points
            if (stat == 'v_available_points') {
                saveCallback(stat, "30");
            }
        });
        if (updateCallback) {updateCallback();}
    }
}

