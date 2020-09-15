<?php
/*****************************************************************************
 *
 * ViewMapAddModifyPickHost.php - Class to render the "pick host" dialog
 *
 *****************************************************************************/

class ViewMapAddModifyPickHost {
  private $MAPCFG = null;

  private $attrs          = array();

  public function parse() {
    global $CORE;
    $this->mode = req('mode', 'addmodify');
    $map_name = req('show');
    if ($this->mode != 'view_params' && $map_name == null)
      throw new NagVisException(l('You need to provide a map name.'));
    if ($map_name !== null && (!preg_match(MATCH_MAP_NAME, $map_name) || count($CORE->getAvailableMaps('/^'.$map_name.'$/')) == 0))
      throw new NagVisException(l('The map does not exist.'));

    $this->MAPCFG = new GlobalMapCfg($map_name);
    $this->MAPCFG->readMapConfig();

    foreach ($_REQUEST as $attr => $val) {
      $this->attrs[$attr] = $val;
    }

    ob_start();
    $this->drawForm();
    return ob_get_clean();
  }

  private function drawForm() {
    form_start('addmodifypickhost', 'javascript:submitForm(\''.cfg('paths', 'htmlbase')
    .'/server/core/ajax_handler.php?mod=Map'
    .'&act=addModify\', \'addmodifypickhost\');');

    $host_list = listHostNamesOfHostgroup($this->MAPCFG, null, $this->attrs);
    if (is_array($host_list) && count($host_list) >= 2) {
      array_shift($host_list);
      $index = 0;
      foreach($host_list as $host_name) {
        echo "<p><label><nobr>";
        radio('related_host_name', $host_name, $index++ == 0 ? true : false);
        echo "&nbsp;$host_name</nobr></label></p>";
      }
    }

    submit(l('Continue'));
    form_end();
  }

  public function object_type()
  {
    return req('type');
  }
}
?>
