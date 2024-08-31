function getDefaultStatsVariables() {
    const stats_variables = ["v_available_points", "v_strength", "v_toughness", "v_agility", "v_reflexes",
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
    const stats_missing = stats_variables.some(function(stat) {
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

// Mapping dictionary to establish the relation between the auxiliary stat 
//  and its corresponding stat, field_name, and span id.
// Note: Attempt is to improve upon the previous problematic approach 
//  where we had hard-coding of the relations in some places (e.g. getAuxiliaryStats)
//  and infer relations in others, (e.g. initializeStats)
function getAuxiliaryStatMapping() {
    let stats_aux_mapping = {};
    stats_aux_mapping["v_available_points_aux"] = {"stat": "v_available_points", "field": "available_points", "label": "available_points_value"};
    stats_aux_mapping["v_strength_aux"] = {"stat": "v_strength", "field": "strength", "label": "strength_value"};
    stats_aux_mapping["v_toughness_aux"] = {"stat": "v_toughness", "field": "toughness", "label": "toughness_value"};
    stats_aux_mapping["v_agility_aux"] = {"stat": "v_agility", "field": "agility", "label": "agility_value"};
    stats_aux_mapping["v_reflexes_aux"] = {"stat": "v_reflexes", "field": "reflexes", "label": "reflexes_value"};
    stats_aux_mapping["v_hearing_aux"] = {"stat": "v_hearing", "field": "hearing", "label": "hearing_value"};
    stats_aux_mapping["v_perception_aux"] = {"stat": "v_perception", "field": "perception", "label": "perception_value"};
    stats_aux_mapping["v_ancient_languages_aux"] = {"stat": "v_ancient_languages", "field": "ancient_languages", "label": "ancient_languages_value"};
    stats_aux_mapping["v_combat_technique_aux"] = {"stat": "v_combat_technique", "field": "combat_technique", "label": "combat_technique_value"};
    stats_aux_mapping["v_premonition_aux"] = {"stat": "v_premonition", "field": "premonition", "label": "premonition_value"};
    stats_aux_mapping["v_bluff_aux"] = {"stat": "v_bluff", "field": "bluff", "label": "bluff_value"};
    stats_aux_mapping["v_magical_sense_aux"] = {"stat": "v_magical_sense", "field": "magical_sense", "label": "magical_sense_value"};
    stats_aux_mapping["v_aura_hardening_aux"] = {"stat": "v_aura_hardening", "field": "aura_hardening", "label": "aura_hardening_value"};
    stats_aux_mapping["v_magical_power_aux"] = {"stat": "v_magical_power", "field": "magical_power", "label": "magical_power_value"};
    stats_aux_mapping["v_magical_knowledge_aux"] = {"stat": "v_magical_knowledge", "field": "magical_knowledge", "label": "magical_knowledge_value"};

    return stats_aux_mapping;
}

function initializeAuxiliaryProperty(locals, stat_property, default_value) {
    var stat_value = locals[stat_property] && !Number.isNaN(locals[stat_property]) ? 
        parseInt(locals[stat_property]) : 0;
    return stat_value;
}

function getAuxiliaryStats(locals, stats_aux_mapping = null) {
    if (!stats_aux_mapping) {
        stats_aux_mapping = getAuxiliaryStatMapping();
    }

    let stats_aux = {}
    for (const [stat_aux_key, stat_aux_value] of Object.entries(stats_aux_mapping)) {
        let stat_key = stat_aux_value["stat"];
        stats_aux[stat_aux_key] = initializeAuxiliaryProperty(locals, stat_key, 0);
    }

    return stats_aux;
}

// This function is called on page load to initialize the stats
// As well as to update when Cancel Changes is clicked
// Unlike getAuxiliaryStats, this function is implemented in a flexible manner, instead of hard-coding
//  For example: notice the calculation of stat, stat_value, stat_field_id, stat_value_span_id
// TODO: Have a discussion on whether this may be too flexible and if it is better to hard-code the stats
function initializeStats(stats_aux, reset_magic_stats = true, stats_aux_mapping = null) {
    if (!stats_aux_mapping) {
        stats_aux_mapping = getAuxiliaryStatMapping();
    }

    for (const [stat_aux_key, stat_aux_value] of Object.entries(stats_aux_mapping)) {

    }

    for (let stat_aux in stats_aux) {
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