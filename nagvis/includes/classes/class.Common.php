<?
##########################################################################
##     	        NagVis - The Nagios Visualisation Addon                 ##
##########################################################################
## class.Common.php - In this class are all methods that have no place  ##
##             		  in the another classes!						    ##
##########################################################################
## Licenced under the terms and conditions of the GPL Licence, 			##
## please see attached "LICENCE" file	                                ##
##########################################################################

##########################################################################
## Code Format: Vars: wordWordWord										##
##		   	 Classes: wordwordword                                      ##
##		     Objects: WORDWORDWORD                                      ##
## Please use TAB (Tab Size: 4 Spaces) to format the code               ##
##########################################################################

/**
* In this class are all methods that have no place in the another classes!
*
* @author Michael Luebben <michael_luebben@web.de>
*/
class common {
	
	/**
	* Search Icon for a State
	*
	* @param string $State
	* @param array $mapCfg
	* @param string $IconConfigCfg
	* @param string $type
	*
	* @author Michael Luebben <michael_luebben@web.de>
	*/
	function findIcon($State,$mapCfg,$IconMapGlobal,$IconConfigCfg,$Type) {
		$rotateUrl = "";
		unset($Icon);
                $valid_format = array(
                        0=>"gif",
                        1=>"png",
                        2=>"bmp",
                        3=>"jpg",
                        4=>"jpeg"
                );
		$StateLow = strtolower($State['State']);
		if(isset($mapCfg['iconset'])) {
			$IconPath = $mapCfg['iconset'];
		}
		elseif(isset($IconMapGlobal)) {
			$IconPath = $IconMapGlobal;
		}
		elseif(isset($IconConfigCfg)) {
			$IconPath = $IconConfigCfg;
		}
		else {
			$IconPath = "std_medium";
		}
		
		switch($Type) {
			case 'map':
				switch($StateLow) {
					case 'ok':
					case 'warning':
					case 'critical':
					case 'unknown':
					case 'ack':		
						$Icon = $IconPath.'_'.$StateLow;
					break;
					default:
						$Icon = $IconPath."_error";
					break;
				}
			break;
			case 'host':
			case 'hostgroup':
				switch($StateLow) {
					case 'down':
					case 'unknown':
					case 'critical':
					case 'unreachable':
					case 'warning':
					case 'ack':
					case 'up':
						$Icon = $IconPath.'_'.$StateLow;
					break;
					default:
						$Icon = $IconPath."_error";
					break;
				}
			break;
			case 'service':
			case 'servicegroup':
				switch($StateLow) {
					case 'critical':
					case 'warning':
					case 'sack':
					case 'unknown':
					case 'ok':
						$Icon = $IconPath.'_'.$StateLow;
					break;
					default:	
						$Icon = $IconPath."_error";
					break;
				}
			break;
			default:
					echo "Unknown Object Type!";
					$Icon = $mapCfg['iconset']."_error";
			break;
		}

		for($i=0;$i<count($valid_format);$i++) {
			if(file_exists($Base."iconsets/".$Icon.".".$valid_format[$i])) {
                                $Icon .= ".".$valid_format[$i];
			}
		}
		if(file_exists($Base."iconsets/".$Icon)) {	
			return $Icon;
		}
		else {
			$Icon = $IconPath."_error.png";
			return $Icon;
		}
	}
	
	/**
	* Create a position for a icon on the map
	*
	* @param string $Icon
	* @param string $x
	* @param string $y
	*
	* @author Michael Luebben <michael_luebben@web.de>
	*/
	function fixIconPosition($Icon,$x,$y) {
		$size = getimagesize("./iconsets/$Icon");
		$posy = $y-($size[1]/2);
		$posx = $x-($size[0]/2);
		$IconDIV = '<DIV CLASS="icon" STYLE="left: '.$posx.'px; top : '.$posy.'px">';
		return($IconDIV);
	}
	
	/**
	* Create a link to Nagios, when this is not set in the Config-File
	*
	* @param string $HTMLCgiPath
	* @param string $mapUrl
	* @param string $type
	* @param string $name
	* @param string $service_description
	*
	* @author Michael Luebben <michael_luebben@web.de>
	*/
	function createLink($HTMLCgiPath,$mapUrl,$type,$name,$service_description) {
		if(isset($mapUrl)) {
			$link = '<A HREF='.$mapUrl.'>';
    	} elseif($type == 'host') {
			$link = '<A HREF="'.$HTMLCgiPath.'/status.cgi?host='.$name.'">';
    	} elseif($type == 'service') {
			$link = '<A HREF="'.$HTMLCgiPath.'/extinfo.cgi?type=2&host='.$name.'&service='.$service_description.'">';
    	} elseif($type == 'hostgroup') {
			$link = '<A HREF="'.$HTMLCgiPath.'/status.cgi?hostgroup='.$name.'&style=detail">';
    	} elseif($type == 'servicegroup') {
			$link = '<A HREF="'.$HTMLCgiPath.'/status.cgi?servicegroup='.$name.'&style=detail">';
    	}
    	return($link);
	}	
}
?>