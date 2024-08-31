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
    stats_aux_mapping["v_available_points_aux"] = {"stat": "v_available_points", "field_id": "available_points", "value_span_id": "available_points_value"};
    stats_aux_mapping["v_strength_aux"] = {"stat": "v_strength", "field_id": "strength", "value_span_id": "strength_value"};
    stats_aux_mapping["v_toughness_aux"] = {"stat": "v_toughness", "field_id": "toughness", "value_span_id": "toughness_value"};
    stats_aux_mapping["v_agility_aux"] = {"stat": "v_agility", "field_id": "agility", "value_span_id": "agility_value"};
    stats_aux_mapping["v_reflexes_aux"] = {"stat": "v_reflexes", "field_id": "reflexes", "value_span_id": "reflexes_value"};
    stats_aux_mapping["v_hearing_aux"] = {"stat": "v_hearing", "field_id": "hearing", "value_span_id": "hearing_value"};
    stats_aux_mapping["v_perception_aux"] = {"stat": "v_perception", "field_id": "perception", "value_span_id": "perception_value"};
    stats_aux_mapping["v_ancient_languages_aux"] = {"stat": "v_ancient_languages", "field_id": "ancient_languages", "value_span_id": "ancient_languages_value"};
    stats_aux_mapping["v_combat_technique_aux"] = {"stat": "v_combat_technique", "field_id": "combat_technique", "value_span_id": "combat_technique_value"};
    stats_aux_mapping["v_premonition_aux"] = {"stat": "v_premonition", "field_id": "premonition", "value_span_id": "premonition_value"};
    stats_aux_mapping["v_bluff_aux"] = {"stat": "v_bluff", "field_id": "bluff", "value_span_id": "bluff_value"};
    stats_aux_mapping["v_magical_sense_aux"] = {"stat": "v_magical_sense", "field_id": "magical_sense", "value_span_id": "magical_sense_value"};
    stats_aux_mapping["v_aura_hardening_aux"] = {"stat": "v_aura_hardening", "field_id": "aura_hardening", "value_span_id": "aura_hardening_value"};
    stats_aux_mapping["v_magical_power_aux"] = {"stat": "v_magical_power", "field_id": "magical_power", "value_span_id": "magical_power_value"};
    stats_aux_mapping["v_magical_knowledge_aux"] = {"stat": "v_magical_knowledge", "field_id": "magical_knowledge", "value_span_id": "magical_knowledge_value"};

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
    for (const [stat_aux, stat_aux_mapping] of Object.entries(stats_aux_mapping)) {
        let stat = stat_aux_mapping["stat"];
        stats_aux[stat_aux] = initializeAuxiliaryProperty(locals, stat, 0);
    }

    return stats_aux;
}

// This function is called on page load to initialize the stats
// As well as to update when Cancel Changes is clicked
// Unlike getAuxiliaryStats, this function is implemented in a flexible manner, instead of hard-coding
//  For example: notice the calculation of stat, stat_value, stat_field_id, stat_value_span_id
// TODO: Have a discussion on whether this may be too flexible and if it is better to hard-code the stats
function initializeStats(stats_aux, stats_aux_mapping = null, reset_magic_stats = true) {
    if (!stats_aux_mapping) {
        stats_aux_mapping = getAuxiliaryStatMapping();
    }

    for (const [stat_aux, stat_aux_value] of Object.entries(stats_aux)) {
        if (!reset_magic_stats && 
        (stat_aux === "v_magical_power_aux" || stat_aux === "v_magical_knowledge_aux")) {
            continue;
        }
        let stat_aux_mapping = stats_aux_mapping[stat_aux]
        let stat = stat_aux_mapping["stat"];
        let stat_field_id = stat_aux_mapping["field_id"];
        let stat_value_span_id = stat_aux_mapping["value_span_id"]
        if (document.getElementById(stat_value_span_id) === null) {continue;}
        document.getElementById(stat_value_span_id).innerHTML = stat_aux_value;
        document.getElementById(stat_field_id).className = "stat-field" + 
            (stat === "v_available_points" ? " available" : "") +
            (stat === "v_magical_power" || stat === "v_magical_knowledge" ? " magic-special" : "");
    }
}