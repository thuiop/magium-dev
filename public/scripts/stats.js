// import utils.js // Perhaps a better way to specify the dependence of the file on utils.js

// Check if some of the stats are undefined.
// If they are, update every stat cookie with the default value 0, and reload the page.

const stats_names = ["available_points", "strength", "toughness", "agility", "reflexes",
    "hearing", "perception", "ancient_languages", "combat_technique", "premonition",
    "bluff", "magical_sense", "aura_hardening", "magical_power", "magical_knowledge",
    "max_stat"]


function initStats(event) {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    if (page != "stats") {
        return;
    }
    locals = readSaveFromLocalStorage("currentState");

    var reload = false;
    stats_names.forEach(function(stat) {
        const stat_var = "v_" + stat;
        const value = locals[stat_var];
        if (value === null || value === undefined) {
            if (stat_var === 'v_max_stat') {
                locals[stat_var] = 3;
            } else {
                locals[stat_var] = 0;
            }
            reload = true;
        }
    });
    if (reload) {
        writeSaveToLocalStorage("currentState",locals);
        window.location.reload();
    }
}
document.addEventListener("htmx:afterSwap", initStats)
document.addEventListener("DOMContentLoaded", initStats)

function updateStat(stat_id) {
    const available_points = parseInt(document.getElementById("available_points_value").innerHTML);
    const current_val = parseInt(document.getElementById(stat_id + "_value").innerHTML);
    const max_val = parseInt(document.getElementById(stat_id + "_max").innerHTML);;

    if ((current_val >= max_val) || (available_points <= 0)) { return; }
    document.getElementById("available_points_value").innerHTML = available_points - 1;
    document.getElementById(stat_id + "_value").innerHTML = current_val + 1;
    document.getElementById(stat_id).className = "stat-field updated";
}

function confirmStats() {
    let data = readSaveFromLocalStorage("currentState");
    for (const stat_name of stats_names) {
        const element = document.getElementById(stat_name + "_value");
        if (element) {
            data["v_" + stat_name] = parseInt(element.innerHTML);;
        }
    }
    writeSaveToLocalStorage("currentState",data);
    // Refresh the page to reflect the changes
    window.location.reload();
}
