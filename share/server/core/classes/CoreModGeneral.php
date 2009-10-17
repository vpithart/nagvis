<?php
class CoreModGeneral extends CoreModule {
	
	public function __construct(GlobalCore $CORE) {
		$this->CORE = $CORE;
		
		$this->aActions = Array(
			'getCfgFileAges' => REQUIRES_AUTHORISATION,
			'getStateProperties' => REQUIRES_AUTHORISATION,
			'getHoverTemplate' => REQUIRES_AUTHORISATION,
			'getContextTemplate' => REQUIRES_AUTHORISATION,
			'getHoverUrl' => REQUIRES_AUTHORISATION,
			'getObjectStates' => REQUIRES_AUTHORISATION
		);
	}
	
	public function handleAction() {
		$sReturn = '';
		
		if($this->offersAction($this->sAction)) {
			switch($this->sAction) {
				case 'getCfgFileAges':
					$sReturn = $this->getCfgFileAges();
				break;
				case 'getStateProperties':
					$sReturn = $this->getStateProperties();
				break;
				case 'getHoverTemplate':
					$sReturn = $this->getHoverTemplate();
				break;
				case 'getContextTemplate':
					$sReturn = $this->getContextTemplate();
				break;
				case 'getHoverUrl':
					$sReturn = $this->getHoverUrl();
				break;
				case 'getObjectStates':
					$sReturn = $this->getObjectStates();
				break;
			}
		}
		
		return $sReturn;
	}
	
	private function getCfgFileAges() {
		$aReturn = Array();
	
		// Parse view specific uri params
		$aKeys = Array('f' => MATCH_STRING_NO_SPACE,
		               'm' => MATCH_MAP_NAME_EMPTY,
		               'am' => MATCH_MAP_NAME_EMPTY);
		$aOpts = $this->getCustomOptions($aKeys);
		
		if(isset($aOpts['f']) && is_array($aOpts['f'])) {
			foreach($aOpts['f'] AS $sFile) {
				if($sFile == 'mainCfg') {
					$aReturn['mainCfg'] = $this->CORE->MAINCFG->getConfigFileAge();
				}
			}
		}
		
		if(isset($aOpts['m']) && is_array($aOpts['m'])) {
			foreach($aOpts['m'] AS $sMap) {
				$MAPCFG = new NagVisMapCfg($this->CORE, $sMap);
				$aReturn[$sMap] = $MAPCFG->getFileModificationTime();
			}
		}
		
		if(isset($aOpts['am']) && is_array($aOpts['am'])) {
			foreach($aOpts['am'] AS $sAutomap) {
				$MAPCFG = new NagVisAutomapCfg($this->CORE, $sAutomap);
				$aReturn[$sAutomap] = $MAPCFG->getFileModificationTime();
			}
		}
		
		return json_encode($aReturn);
	}
	
	private function getStateProperties() {
		echo json_encode($this->CORE->MAINCFG->getStateWeight());
	}
	
	private function getHoverTemplate() {
		$arrReturn = Array();
		
		// Parse view specific uri params
		$aKeys = Array('name' => MATCH_STRING_NO_SPACE);
		$aOpts = $this->getCustomOptions($aKeys);
		
		foreach($aOpts['name'] AS $sName) {
			$OBJ = new NagVisHoverMenu($this->CORE, $sName);
			$arrReturn[] = Array('name' => $sName, 'code' => str_replace("\r\n", "", str_replace("\n", "", $OBJ->__toString())));
		}
		
		return json_encode($arrReturn);
	}
	
	private function getContextTemplate() {
		$arrReturn = Array();
		
		// Parse view specific uri params
		$aKeys = Array('name' => MATCH_STRING_NO_SPACE);
		$aOpts = $this->getCustomOptions($aKeys);
		
		foreach($aOpts['name'] AS $sName) {
			$OBJ = new NagVisContextMenu($this->CORE, $sName);
			$arrReturn[] = Array('name' => $sName, 'code' => str_replace("\r\n", "", str_replace("\n", "", $OBJ->__toString())));
		}
		
		return json_encode($arrReturn);
	}
	
	private function getHoverUrl() {
		$arrReturn = Array();
		
		// Parse view specific uri params
		$aKeys = Array('url' => MATCH_STRING_URL);
		$aOpts = $this->getCustomOptions($aKeys);
		
		foreach($aOpts['url'] AS $sUrl) {
			$OBJ = new NagVisHoverUrl($this->CORE, $sUrl);
			$arrReturn[] = Array('url' => $sUrl, 'code' => $OBJ->__toString());
		}
		
		return json_encode($arrReturn);
	}
	
	private function getObjectStates() {
		$arrReturn = Array();
		
		$aOpts = Array('ty' => MATCH_GET_OBJECT_TYPE,
		               't' => MATCH_OBJECT_TYPES,
		               'n1' => MATCH_STRING_NO_SPACE,
		               'n2' => MATCH_STRING_NO_SPACE_EMPTY,
		               'i' => MATCH_STRING_NO_SPACE);
		
		$aVals = $this->getCustomOptions($aOpts);
		
		$sType = $aVals['ty'];
		$arrType = $aVals['t'];
		$arrName1 = $aVals['n1'];
		$arrName2 = $aVals['n2'];
		$arrObjId = $aVals['i'];
		
		// Initialize backends
		$BACKEND = new GlobalBackendMgmt($this->CORE);
			
		$numObjects = count($arrType);
		for($i = 0; $i < $numObjects; $i++) {
			// Get the object configuration
			$objConf = $this->getObjConf($arrType[$i], $arrName1[$i], $arrName2[$i]);
			$objConf['object_id'] = $arrObjId[$i];
			
			switch($arrType[$i]) {
				case 'host':
					$OBJ = new NagVisHost($this->CORE, $BACKEND, $objConf['backend_id'], $arrName1[$i]);
				break;
				case 'service':
					$OBJ = new NagVisService($this->CORE, $BACKEND, $objConf['backend_id'], $arrName1[$i], $arrName2[$i]);
				break;
				case 'hostgroup':
					$OBJ = new NagVisHostgroup($this->CORE, $BACKEND, $objConf['backend_id'], $arrName1[$i]);
				break;
				case 'servicegroup':
					$OBJ = new NagVisServicegroup($this->CORE, $BACKEND, $objConf['backend_id'], $arrName1[$i]);
				break;
				case 'map':
					// Initialize map configuration based on map type
					$MAPCFG = new NagVisMapCfg($this->CORE, $arrName1[$i]);
					$MAPCFG->readMapConfig();
					
					$MAP = new NagVisMap($this->CORE, $MAPCFG, $BACKEND);
					
					$OBJ = $MAP->MAPOBJ;
				break;
				case 'automap':
					// Initialize map configuration based on map type
					$MAPCFG = new NagVisAutomapCfg($this->CORE, $arrName1[$i]);
					$MAPCFG->readMapConfig();
					
					// FIXME: Maybe should be recoded?
					// FIXME: What about the options given in URL when calling the map?
					$opts = Array();
					// Fetch option array from defaultparams string (extract variable
					// names and values)
					$params = explode('&', $this->CORE->MAINCFG->getValue('automap','defaultparams'));
					unset($params[0]);
					foreach($params AS &$set) {
						$arrSet = explode('=',$set);
						$opts[$arrSet[0]] = $arrSet[1];
					}
					// Save the automap name to use
					$opts['automap'] = $arrName1[$i];
					// Save the preview mode
					$opts['preview'] = 1;
					
					$MAP = new NagVisAutoMap($this->CORE, $MAPCFG, $BACKEND, $opts);
					$OBJ = $MAP->MAPOBJ;
				break;
				default:
					echo 'Error: '.$CORE->LANG->getText('unknownObject', Array('TYPE' => $arrType[$i], 'MAPNAME' => ''));
				break;
			}
			
			// Apply default configuration to object
			$OBJ->setConfiguration($objConf);
			
			// These things are already done by NagVisMap and NagVisAutoMap classes
			// for the NagVisMapObj objects. Does not need to be done a second time.
			if(get_class($OBJ) != 'NagVisMapObj') {
				$OBJ->fetchMembers();
				$OBJ->fetchState();
			}
			
			$OBJ->fetchIcon();
			
			switch($sType) {
				case 'state':
					$arr = $OBJ->getObjectStateInformations();
				break;
				case 'complete':
					$arr = $OBJ->parseJson();
				break;
			}
			
			$arr['object_id'] = $OBJ->getObjectId();
			$arr['icon'] = $OBJ->get('icon');
			
			$arrReturn[] = $arr;
		}
		
		return json_encode($arrReturn);
	}

	private function getObjConf($objType, $objName1, $objName2) {
		$objConf = Array();
		
		// Get the object configuration from main configuration defaults by
		// creating a temporary map object
		$objConf['type'] = $objType;
		
		if($objType == 'service') {
			$objConf['host_name'] = $objName1;
			$objConf['service_description'] = $objName2;
		} else {
			$objConf[$objType.'_name'] = $objName1;
		}
		
		$TMPMAPCFG = new NagVisMapCfg($this->CORE);
		
		// merge with "global" settings
		foreach($TMPMAPCFG->getValidTypeKeys('global') AS $key) {
			if($key != 'type') {
				$objConf[$key] = $TMPMAPCFG->getValue('global', 0, $key);
			}
		}
		
		unset($TMPMAPCFG);
		
		return $objConf;
	}
}
?>
