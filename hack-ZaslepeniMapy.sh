#!/bin/bash

SED='sed'
[[ "$OSTYPE" =~ 'darwin' ]] && SED='gsed'

#
# (1) doplnit do default.index.html:
#  <script type="text/javascript" src="{$htmlJs}ViewWorldmap-HackZaslepeniMapy.js?v={$version}" id="HackZaslepeniMapy" data-client-remote-address="{$REMOTE_ADDR}"></script>
#
if ! grep 'script.*ViewWorldmap-HackZaslepeniMapy\.js' share/userfiles/templates/default.index.html >/dev/null
then
  SCRIPT='<script type="text/javascript" src="{$htmlJs}ViewWorldmap-HackZaslepeniMapy.js?v={$version}" id="HackZaslepeniMapy" data-client-remote-address="{$REMOTE_ADDR}"></script>'
  $SED -i "/<\/head>/i $SCRIPT" share/userfiles/templates/default.index.html
fi

#
# (2) doplnit do NagVisIndexView.php:
#  $aData['REMOTE_ADDR'] = $_SERVER['REMOTE_ADDR'];
#
if ! grep 'aData.*REMOTE_ADDR.*_SERVER' share/frontend/nagvis-js/classes/NagVisIndexView.php >/dev/null
then
  SNIPPET='$aData["REMOTE_ADDR"] = $_SERVER["REMOTE_ADDR"];'
  $SED -i "/Build page based on the template file and the data array/a $SNIPPET" share/frontend/nagvis-js/classes/NagVisIndexView.php
fi

#
# (3) doinstalovat novej soubor:
#
cat > share/frontend/nagvis-js/js/ViewWorldmap-HackZaslepeniMapy.js << EOF
/*
 * RD-specific hack pro (ne)zobrazovani slepe mapy pro techniky - ZACATEK
 */

// Slepa mapa se zobrazuje pro zoom mensi nebo rovny:
var slepaMapa_zoom = 16;
// a pri pristupu z IP adres:
var slepaMapa_ip_regex = /^10\.10\.25[45]\./;
// ... krome:
var slepaMapa_vynechat_ip_regex = /^10\.10\.255\.5$/;

var ViewWorldmap = ViewWorldmap.extend({
  slepaMapa: false,
  mapovyPodkladyZobrazeny: true,

  // Hack: po inicializaci mapy (reload prohlizece) rozhodnout, jestli zaslepit nebo ne
  initWorldmap: async function() {
    this.base();
    this.zaslepitNeboNezaslepit();
  },

  // Hack: pri zoom-in/zoom-out rozhodnout, jestli zaslepit nebo ne
  handleMoveEnd: function(lEvent) {
    this.zaslepitNeboNezaslepit();
    this.base();
  },

  // Hack: (ne)zobrazovat labels (popisky u objektu)
  addObject (attrs) {
    if (this.slepaMapa) attrs.label_show = '0';
    this.base(attrs);
  },

  zaslepitNeboNezaslepit: function() {
    this.slepaMapa = false;

    let zoom = g_map.getZoom();
    let ipadresa = document.querySelector('script#HackZaslepeniMapy').dataset.clientRemoteAddress;

    let zaslepit = false;
    if (zoom <= slepaMapa_zoom && ipadresa && ipadresa.match(slepaMapa_ip_regex))
      zaslepit = true;
    if (slepaMapa_vynechat_ip_regex && ipadresa.match(slepaMapa_vynechat_ip_regex))
      zaslepit = false;

    console.log('zaslepitNeboNezaslepit? zoom', zoom, 'ip', ipadresa, '->', zaslepit);

    if (!zaslepit && !this.mapovyPodkladyZobrazeny) {
        this.zobrazitMapovyPodklady();
    }

    if (zaslepit && this.mapovyPodkladyZobrazeny) {
        this.skrejtMapovyPodklady();
    }

    this.slepaMapa = zaslepit;
  },

  zobrazitMapovyPodklady: function() {
      /* obnovit layer s mapovyma podkladama */
      if (this.hiddenLayer) {
        this.hiddenLayer.addTo(g_map);
        this.hiddenLayer = undefined;
      }
      /* obnovit control (prepinac map/satellite) */
      if (this.hiddenLayerControls && this.hiddenLayerControlsParent) {
        this.hiddenLayerControlsParent.appendChild(this.hiddenLayerControls);
      }
      this.mapovyPodkladyZobrazeny = true;
  },

  skrejtMapovyPodklady: function() {
      /* najit layer s mapovyma podkladama a odstranit ho */
      g_map.eachLayer((layer) => {
        if (layer._url) {
          this.hiddenLayer = layer;
          layer.remove();
        }
      });
      /* smazat control (prepinac map/satellite) */
      if (g_map._controlCorners && g_map._controlCorners.topright) {
        this.hiddenLayerControls = g_map._controlCorners.topright;
        this.hiddenLayerControlsParent = g_map._controlCorners.topright.parentNode;
        g_map._controlCorners.topright.remove();
      }
      this.mapovyPodkladyZobrazeny = false;
  },
});
/*
 * RD-specific hack pro (ne)zobrazovani slepe mapy pro techniky - KONEC
 */
EOF
