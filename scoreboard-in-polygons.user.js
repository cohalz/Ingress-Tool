// ==UserScript==
// @id             iitc-plugin-scoreboard-in-polygons@cohalz
// @name           IITC plugin: show a scoreboard in polygons.
// @version        0.2.0.20171117.115622
// @category       Info
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @downloadURL    https://github.com/cohalz/Ingress-Tool/raw/master/scoreboard-in-polygons.user.js
// @description    [iitc-test-2017-11-17-115622] Display 3 scoreboards about all portals, links & fields count in polygons.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

const wrapper = function (pluginInfo) {

    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') window.plugin = function () {};

    //PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
    //(leaving them in place might break the 'About IITC' page or break update checks)
    pluginInfo.buildName = 'iitc-test';
    pluginInfo.dateTimeVersion = '20171117.115622';
    pluginInfo.pluginId = 'scoreboard-in-polygons';
    //END PLUGIN AUTHORS NOTE

    // PLUGIN START //

    // use own namespace for plugin
    window.plugin.scoreboardInPolygons = function () {};

    window.plugin.scoreboardInPolygons.getVisiblePolygons = function () {

        const displayBounds = map.getBounds(),
            visiblePolygons = [];

        for (const layer of plugin.drawTools.drawnItems.getLayers()) {

            if (layer instanceof L.GeodesicPolygon) {

                let visible = true;

                for (const point of layer.getLatLngs()) {

                    if (!displayBounds.contains(point)) {

                        visible = false;
                        break;

                    }

                }
                if (visible) visiblePolygons.push(layer);

            }

        }

        return visiblePolygons;

    };

    window.plugin.scoreboardInPolygons.containsPoint = function (polygon, point) {

        const polygonPoint = polygon.getLatLngs();

        let contains = false;

        for (let i = 0; i < polygonPoint.length; i++) {

            let p1 = polygonPoint[i],
                p2 = polygonPoint[(i + 1) % polygonPoint.length];

            if (p1.lat > p2.lat) [p1, p2] = [p2, p1];

            if ((p1.lat < point.lat) === (point.lat <= p2.lat) &&
              (point.lng - p1.lng) * (p2.lat - p1.lat) < (p2.lng - p1.lng) * (point.lat - p1.lat)) {

                contains = !contains;

            }

        }

        return contains;

    };

    window.plugin.scoreboardInPolygons.countPortals = function (polygons) {

        const portalCount = {};

        portalCount[TEAM_RES] = 0;
        portalCount[TEAM_ENL] = 0;

        $.each(window.portals, (i, portal) => {

            for (const polygon of polygons) {

                if (plugin.scoreboardInPolygons.containsPoint(polygon, portal.getLatLng())) {

                    portalCount[portal.options.team]++;
                    break;

                }

            }

        });

        return portalCount;

    };

    window.plugin.scoreboardInPolygons.countLinks = function (polygons) {

        const linkCount = {};

        linkCount[TEAM_RES] = 0;
        linkCount[TEAM_ENL] = 0;

        $.each(window.links, (guid, link) => {

            for (const polygon of polygons) {

                if (link.getLatLngs().some((linkPoint) => plugin.scoreboardInPolygons.containsPoint(polygon, linkPoint))) {

                    linkCount[link.options.team]++;
                    break;

                }

            }

        });

        return linkCount;

    };

    window.plugin.scoreboardInPolygons.countFields = function (polygons) {

        const fieldCount = {};

        fieldCount[TEAM_RES] = 0;
        fieldCount[TEAM_ENL] = 0;

        $.each(window.fields, (guid, field) => {

            for (const polygon of polygons) {

                if (field.getLatLngs().every((fieldPoint) => plugin.scoreboardInPolygons.containsPoint(polygon, fieldPoint))) {

                    fieldCount[field.options.team]++;
                    break;

                }

            }

        });

        return fieldCount;

    };

    window.plugin.scoreboardInPolygons.displayScoreboard = function () {

        if (window.plugin.scoreboardInPolygons.getVisiblePolygons().length === 0) {

            alert("No visible polygons");

            return;

        }


        const html = window.plugin.scoreboardInPolygons.createScoreboardTable();

        if (window.useAndroidPanes()) {

            $(`<div id="scoreboardInPolygons" class="mobile">${html}</div>`).appendTo(document.body);

        } else {

            dialog({
                "dialogClass": 'ui-dialog-scoreboard-in-polygons',
                "html": `<div id="scoreboardInPolygons">${html}</div>`,
                "id": 'ScoreboardInPolygons',
                "title": 'Scoreboard In Polygons',
                "width": 700
            });

        }

    };

    // A function that creates the html code for the scoreboard table
    window.plugin.scoreboardInPolygons.createScoreboardTable = function () {

        let html = "";

        const visiblePolygons = window.plugin.scoreboardInPolygons.getVisiblePolygons();

        const portalsCount = window.plugin.scoreboardInPolygons.countPortals(visiblePolygons);
        const linksCount = window.plugin.scoreboardInPolygons.countLinks(visiblePolygons);
        const fieldsCount = window.plugin.scoreboardInPolygons.countFields(visiblePolygons);

        const resPortalsPer = 100 * portalsCount[TEAM_RES] / (portalsCount[TEAM_ENL] + portalsCount[TEAM_RES]);
        const enlPortalsPer = 100 - resPortalsPer;

        const resLinksPer = 100 * linksCount[TEAM_RES] / (linksCount[TEAM_ENL] + linksCount[TEAM_RES]);
        const enlLinksPer = 100 - resLinksPer;

        const resFieldsPer = 100 * fieldsCount[TEAM_RES] / (fieldsCount[TEAM_ENL] + fieldsCount[TEAM_RES]);
        const enlFieldsPer = 100 - resFieldsPer;

        html += '<table class="portals">' +
            '<tr>' +
            '<th class="firstColumn">Metrics</th>' +
            '<th class="secondColumn">Scoreboards</th>' +
            '</tr>\n';

        html += '<tr><td style="text-align:center;">Portals</td>';

        html += `<td class="scoreboardInPolygons" title="Resistance:\t${portalsCount[TEAM_RES]}\tPortals\nEnlightened:\t${portalsCount[TEAM_ENL]}\tPortals">`;
        html += `<span class="res" style="width:${resPortalsPer}%;">${Math.round(resPortalsPer)}%&nbsp;</span>`;
        html += `<span class="enl" style="width:${enlPortalsPer}%;">&nbsp;${Math.round(enlPortalsPer)}%</span>`;
        html += '</td></tr>';

        html += '<tr><td style="text-align:center;">Links</td>';

        html += `<td class="scoreboardInPolygons" title="Resistance:\t${linksCount[TEAM_RES]}\tLinks\nEnlightened:\t${linksCount[TEAM_ENL]}\tLinks">`;
        html += `<span class="res" style="width:${resLinksPer}%;">${Math.round(resLinksPer)}%&nbsp;</span>`;
        html += `<span class="enl" style="width:${enlLinksPer}%;">&nbsp;${Math.round(enlLinksPer)}%</span>`;
        html += '</td></tr>';

        html += '<tr><td style="text-align:center;">Fields</td>';
        html += `<td class="scoreboardInPolygons" title="Resistance:\t${fieldsCount[TEAM_RES]}\tFields\nEnlightened:\t${fieldsCount[TEAM_ENL]}\tFields">`;
        html += `<span class="res" style="width:${resFieldsPer}%;">${Math.round(resFieldsPer)}%&nbsp;</span>`;
        html += `<span class="enl" style="width:${enlFieldsPer}%;">&nbsp;${Math.round(enlFieldsPer)}%</span>`;
        html += '</td><tr></table>';

        return html;

    };

    const setup = function () {

        // use android panes,texture and style
        if (window.useAndroidPanes()) {

            android.addPane("plugin-ScoreboardInPolygons", "ScoreboardInPolygons", "ic_action_paste");
            addHook("paneChanged", window.plugin.scoreboardInPolygons.onPaneChanged);

        } else {

            $('#toolbox').append(' <a onclick="window.plugin.scoreboardInPolygons.displayScoreboard()" title="Display a dynamic scoreboard in the current polygons">Scoreboard In Polygons</a>');

        }
        //set style for the scoreboard and its cells
        $('head').append('<style>' +
            '#scoreboardInPolygons.mobile {background: transparent; border: 0 none !important; height: 100% !important; width: 100% !important; left: 0 !important; top: 0 !important; position: absolute; overflow: auto; }' +
            '#scoreboardInPolygons table { margin-top:5px; border-collapse: collapse; empty-cells: show; width: 100%; clear: both; }' +
            '#scoreboardInPolygons table td, #scoreboardInPolygons table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
            '#scoreboardInPolygons table tr.res td { background-color: #005684; }' +
            '#scoreboardInPolygons table tr.enl td { background-color: #017f01; }' +
            '#scoreboardInPolygons table th { text-align: center; }' +
            '#scoreboardInPolygons table td { text-align: center; }' +
            '#scoreboardInPolygons table.portals td { white-space: nowrap; }' +
            '#scoreboardInPolygons .firstColumn { margin-top: 10px;}' +
            '#scoreboardInPolygons .disclaimer { margin-top: 10px; font-size:10px; }' +
            '.scoreboardInPolygons span { display: block; float: left;font-weight: bold; cursor: help; height: 21px; line-height: 22px; }' +
            '.scoreboardInPolygons .res { background: #005684; }' +
            '.scoreboardInPolygons .enl { background: #017f01; }' +
            '</style>');

    };

    if (window.plugin.drawTools === undefined) {

        alert("'scoreboard-in-polygons' requires 'draw-tools'");

        return;

    }

    // PLUGIN END //////////////////////////////////////////////////////////
    //add the script info data to the function as a property
    setup.info = pluginInfo;
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') setup();

};

// inject code into site context
const script = document.createElement('script'),
    info = {};

if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {

    info.script = {
        "version": GM_info.script.version,
        "name": GM_info.script.name,
        "description": GM_info.script.description

    };

}
script.appendChild(document.createTextNode(`(${wrapper})(${JSON.stringify(info)});`));
(document.body || document.head || document.documentElement).appendChild(script);
