/*****************************************************************************
 *
 * NagVisObject.js - This class handles the visualisation of Nagvis objects
 *
 * Copyright (c) 2004-2011 NagVis Project (Contact: info@nagvis.org)
 *
 * License:
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 *
 *****************************************************************************/
 
/**
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */

var NagVisObject = Base.extend({
	parsedObject:          null,
	hover_template_code:   null,
	context_template_code: null,
	conf:                  null,
	contextMenu:           null,
	lastUpdate:            null,
	firstUpdate:           null,
	bIsFlashing:           false,
	bIsLocked:             true,
	objControls:           null,
	childs:                null,
	
	constructor: function(oConf) {
		// Initialize
		this.setLastUpdate();
		
		this.childs      = [];
		this.objControls = [];
		this.conf        = oConf;
		
		// When no object_id given by server: generate own id
		if(this.conf.object_id == null)
			this.conf.object_id = getRandomLowerCaseLetter() + getRandom(1, 99999);
		
		// Load view specific config modifiers (Normaly triggered by url params)
		this.loadViewOpts();

		// Load lock options
		this.loadLocked();
	},


	/**
	 * PRIVATE loadLocked
	 * Loads the lock state of an object from the user properties
	 */
	loadLocked: function() {
	    if(!oUserProperties.hasOwnProperty('unlocked-' + oPageProperties.map_name))
		return;

	    var unlocked = oUserProperties['unlocked-' + oPageProperties.map_name].split(',');
	    this.bIsLocked = unlocked.indexOf(this.conf.object_id) === -1 && unlocked.indexOf('*') === -1;
	    unlocked = null;
	},
	
	/**
	 * PUBLIC loadViewOpts
	 *
	 * Loads view specific options. Basically this options are triggered by url params
	 *
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	loadViewOpts: function() {
		// View specific hover modifier set. Will override the map configured option
		if(oViewProperties && oViewProperties.enableHover && oViewProperties.enableHover != '')
			this.conf.hover_menu = '0';
		
		// View specific hover modifier set. Will override the map configured option
		if(oViewProperties && oViewProperties.enableHover && oViewProperties.enableHover != '')
			this.conf.context_menu = '0';
	},
	
	/**
	 * PUBLIC setLastUpdate
	 *
	 * Sets the time of last status update of this object
	 *
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	setLastUpdate: function() {
		this.lastUpdate = iNow;
		
		// Save datetime of the first state update (needed for hover parsing)
		if(this.firstUpdate === null)
			this.firstUpdate = this.lastUpdate;
	},
  
	/**
	 * PUBLIC getContextMenu()
	 *
	 * Creates a context menu for the object
	 *
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	getContextMenu: function (sObjId) {
		// Only enable context menu when configured
		if(this.conf.context_menu && this.conf.context_menu == '1') {
			// Writes template code to "this.context_template_code"
			this.getContextTemplateCode();
			
			// Replace object specific macros
			this.replaceContextTemplateMacros();
			
			var doc = document;
			var oObj = doc.getElementById(sObjId);
			var oContainer = doc.getElementById(this.conf.object_id);
			
			if(oObj == null) {
				eventlog("NagVisObject", "critical", "Could not get context menu object (ID:"+sObjId+")");
				return false;
			}
			
			if(oContainer == null) {
				eventlog("NagVisObject", "critical", "Could not get context menu container (ID:"+this.conf.object_id+")");
				oObj = null; 
				return false;
			}
			
			// Only create a new div when the context menu does not exist
			var contextMenu = doc.getElementById(this.conf.object_id+'-context');
			var justAdded = false;
			if(!contextMenu) {
				// Create context menu div
				var contextMenu = doc.createElement('div');
				contextMenu.setAttribute('id', this.conf.object_id+'-context');
				contextMenu.setAttribute('class', 'context');
				contextMenu.setAttribute('className', 'context');
				contextMenu.style.zIndex = '1000';
				contextMenu.style.display = 'none';
				contextMenu.style.position = 'absolute';
				contextMenu.style.overflow = 'visible';
				justAdded = true;
			}
			
			// Append template code to context menu div
			contextMenu.innerHTML = this.context_template_code;
			
			if(justAdded) {
				// Append context menu div to object container
				oContainer.appendChild(contextMenu);
			
				// Add eventhandlers for context menu
				oObj.onmousedown = contextMouseDown;
				oObj.oncontextmenu = contextShow;
			}
			
			contextMenu = null;
			oContainer = null;
			oObj = null;
			doc = null;
		}
  },
	
	/**
	 * replaceContextTemplateMacros()
	 *
	 * Replaces object specific macros in the template code
	 *
	 * @return	String		HTML code for the hover box
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	replaceContextTemplateMacros: function() {
		var oSectionMacros = {};
		
		// Break when no template code found
		if(!this.context_template_code || this.context_template_code === '') {
			return false;
		}
		
		var oMacros = {
			'obj_id':      this.conf.object_id,
			'type':        this.conf.type,
			'name':        this.conf.name,
			'address':     this.conf.address,
			'html_cgi':    this.conf.htmlcgi,
			'backend_id':  this.conf.backend_id,
			'custom_1':    this.conf.custom_1,
			'custom_2':    this.conf.custom_2,
			'custom_3':    this.conf.custom_3
		};

	  if(typeof(oPageProperties) != 'undefined' && oPageProperties != null 
		   && (oPageProperties.view_type === 'map' || oPageProperties.view_type === 'automap'))
			oMacros.map_name = oPageProperties.map_name;
		
		if(this.conf.type === 'service') {
			oMacros.service_description = escapeUrlValues(this.conf.service_description);
			
			oMacros.pnp_hostname = this.conf.name.replace(/\s/g,'%20');
			oMacros.pnp_service_description = this.conf.service_description.replace(/\s/g,'%20');
		} else
			oSectionMacros.service = '<!--\\sBEGIN\\sservice\\s-->.+?<!--\\sEND\\sservice\\s-->';
		
		// Macros which are only for hosts
		if(this.conf.type === 'host')
			oMacros.pnp_hostname = this.conf.name.replace(/\s/g,'%20');
		else
			oSectionMacros.host = '<!--\\sBEGIN\\shost\\s-->.+?<!--\\sEND\\shost\\s-->';

		if(oPageProperties.view_type === 'automap')
			oSectionMacros.not_automap = '<!--\\sBEGIN\\snot_automap\\s-->.+?<!--\\sEND\\snot_automap\\s-->';
		if(this.conf.view_type !== 'line')
			oSectionMacros.line = '<!--\\sBEGIN\\sline\\s-->.+?<!--\\sEND\\sline\\s-->';
		if(this.conf.view_type !== 'line' || (this.conf.line_type == 11 || this.conf.line_type == 12))
			oSectionMacros.line_type = '<!--\\sBEGIN\\sline_two_parts\\s-->.+?<!--\\sEND\\sline_two_parts\\s-->';

		// Replace hostgroup range macros when not in a hostgroup
		if(this.conf.type !== 'hostgroup')
			oSectionMacros.hostgroup = '<!--\\sBEGIN\\shostgroup\\s-->.+?<!--\\sEND\\shostgroup\\s-->';

		// Replace servicegroup range macros when not in a servicegroup
		if(this.conf.type !== 'servicegroup')
			oSectionMacros.servicegroup = '<!--\\sBEGIN\\sservicegroup\\s-->.+?<!--\\sEND\\sservicegroup\\s-->';

		// Replace map range macros when not in a hostgroup
		if(this.conf.type !== 'map')
			oSectionMacros.map = '<!--\\sBEGIN\\smap\\s-->.+?<!--\\sEND\\smap\\s-->';
		
		// Loop and replace all unwanted section macros
		for (var key in oSectionMacros) {
			var regex = getRegEx('section-'+key, oSectionMacros[key], 'gm');
			this.context_template_code = this.context_template_code.replace(regex, '');
			regex = null;
		}
		oSectionMacros = null;
		
		// Loop and replace all normal macros
		this.context_template_code = this.context_template_code.replace(/\[(\w*)\]/g, 
		                             function(){ return oMacros[ arguments[1] ] || '';});
		oMacros = null;
	},
	
	/**
	 * getContextTemplateCode()
	 *
	 * Get the context template from the global object which holds all templates of 
	 * the map
	 *
	 * @return	String		HTML code for the hover box
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	getContextTemplateCode: function() {
		this.context_template_code = oContextTemplates[this.conf.context_template];
	},
	
	/**
	 * PUBLIC getHoverMenu
	 *
	 * Creates a hover box for objects
	 *
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	getHoverMenu: function (sObjId) {
		// Only enable hover menu when configured
		if(!this.conf.hover_menu || this.conf.hover_menu != '1')
			return;

		var objId = this.conf.object_id;
		var sTemplateCode;
		var iHoverDelay = this.conf.hover_delay;
		
		// Parse the configured URL or get the hover menu
		if(this.conf.hover_url && this.conf.hover_url !== '') {
			this.getHoverUrlCode();
			
			sTemplateCode = this.hover_template_code;
		} else {
			// Only fetch hover template code and parse static macros when this is
			// no update
			if(this.hover_template_code === null)
				this.getHoverTemplateCode();
			
			// Replace dynamic (state dependent) macros
			sTemplateCode = replaceHoverTemplateDynamicMacros(this);
		}
		
		var doc = document;
		var oObj = doc.getElementById(sObjId);
		var oContainer = doc.getElementById(this.conf.object_id);
		
		if(oObj == null) {
			eventlog("NagVisObject", "critical", "Could not get hover menu object (ID:"+sObjId+")");
			return false;
		}
		
		if(oContainer == null) {
			eventlog("NagVisObject", "critical", "Could not get hover menu container (ID:"+this.conf.object_id+")");
			oObj = null; 
			return false;
		}
		
		// Only create a new div when the hover menu does not exist
		var hoverMenu = doc.getElementById(this.conf.object_id+'-hover');
		var justCreated = false;
		if(!hoverMenu) {
			// Create hover menu div
			var hoverMenu = doc.createElement('div');
			hoverMenu.setAttribute('id', this.conf.object_id+'-hover');
			hoverMenu.setAttribute('class', 'hover');
			hoverMenu.setAttribute('className', 'hover');
			hoverMenu.style.zIndex = '1000';
			hoverMenu.style.display = 'none';
			hoverMenu.style.position = 'absolute';
			hoverMenu.style.overflow = 'visible';
			justCreated = true;
		}
		
		// Append template code to hover menu div
		hoverMenu.innerHTML = sTemplateCode;
		sTemplateCode = null;
		
		if(justCreated) {
			// Append hover menu div to object container
			oContainer.appendChild(hoverMenu);
		
			// Add eventhandlers for hover menu
			if(oObj) {
				oObj.onmousemove = function(e) { var id = objId; var iH = iHoverDelay; displayHoverMenu(e, id, iH); id = null; iH = null; };
				oObj.onmouseout = function() { hoverHide(); };
			}
		}

		justCreated = null;
		hoverMenu = null;
		oContainer = null;
		oObj = null;
		doc = null;
	},
	
	/**
	 * getHoverUrlCode()
	 *
	 * Get the hover code from the hover url
	 *
	 * @return	String		HTML code for the hover box
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	getHoverUrlCode: function() {
		this.hover_template_code = oHoverUrls[this.conf.hover_url];
		
		if(this.hover_template_code === null)
			this.hover_template_code = '';
	},
	
	/**
	 * getHoverTemplateCode()
	 *
	 * Get the hover template from the global object which holds all templates of 
	 * the map
	 *
	 * @return	String		HTML code for the hover box
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	getHoverTemplateCode: function() {
		// Asign the template code and replace only the static macros
		// These are typicaly configured static configued values from nagios
		this.hover_template_code = replaceHoverTemplateStaticMacros(this, oHoverTemplates[this.conf.hover_template]);
	},

	/**
	 * Locks/Unlocks the object and fires dependent actions
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	toggleLock: function(lock) {
		if(isset(lock))
			this.bIsLocked = lock;
		else
			this.bIsLocked = !this.bIsLocked;

		if(this.toggleObjControls()) {
			if(!isset(lock)) {
			    if(oUserProperties.hasOwnProperty('unlocked-' + oPageProperties.map_name))
				var unlocked = oUserProperties['unlocked-' + oPageProperties.map_name].split(',');
			    else
				var unlocked = [];

			    if(this.bIsLocked)
			        unlocked.splice(unlocked.indexOf(this.conf.object_id), 1);
			    else
			        unlocked.push(this.conf.object_id);
			    storeUserOption('unlocked-' + oPageProperties.map_name, unlocked.join(','));
			    unlocked = null;
			}

			return this.bIsLocked ? -1 : 1;
		} else {
			return 0;
		}
	},

	/**
	 * Shows or hides all object controls of a map object depending
	 * on the lock state of this object.
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	toggleObjControls: function() {
		if(!this.bIsLocked) {
			if(isset(this.parseControls)) {
				this.parseControls();
				return true;
			}
		} else {
			if(isset(this.removeControls)) {
				this.removeControls();
				return true;
			}
		}
		return false;
	},

	/**
	 * This method parses a given coordinate which can be a simple integer
	 * which is simply returned or a reference to another object and/or
	 * a specified anchor of the object.
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	parseCoord: function(val, dir) {
		if(!isRelativeCoord(val)) {
			return parseInt(val);
		} else {
			// This must be an object id. Is there an offset given?
			if(val.search('%') !== -1) {
				var parts     = val.split('%');
				var objectId  = parts[0];
				var offset    = parts[1];
				var refObj    = getMapObjByDomObjId(objectId);
				if(refObj)
					return parseFloat(refObj.parseCoord(refObj.conf[dir], dir)) + parseFloat(offset);
				else
					return 0;
			} else {
				// Only an object id. Get the coordinate and return it
				var refObj = getMapObjByDomObjId(val);
				if(refObj)
					return parseInt(refObj.parseCoord(refObj.conf[dir], dir));
				else
					return 0;
			}
		}
	},

	/**
	 * Wrapper for the parseCoord method to parse multiple coords at once
	 * e.g. for lines.
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	parseCoords: function(val, dir) {
		var l = val.split(',');

		for(var i = 0, len = l.length; i < len; i++)
			l[i] = this.parseCoord(l[i], dir);

		return l;
	},

	// Transform the current coords to absolute coords when relative
	makeAbsoluteCoords: function(num) {
		var x = num === -1 ? this.conf.x : this.conf.x.split(',')[num];
		var y = num === -1 ? this.conf.y : this.conf.y.split(',')[num];

		// Skip when already absolute
		if(!isRelativeCoord(x) && !isRelativeCoord(y))
			return;

		// Get parent object ids
		var xParent = this.getCoordParent(this.conf.x, num);
		var yParent = this.getCoordParent(this.conf.y, num);

		if(xParent == yParent) {
			getMapObjByDomObjId(xParent).delChild(this);
		} else {
			getMapObjByDomObjId(xParent).delChild(this);
			getMapObjByDomObjId(yParent).delChild(this);
		}
		xParent = null;
		yParent = null;

		// FIXME: Maybe the parent object is also a line. Then -1 is not correct
		//        But it is not coded to attach relative objects to lines. So it is no big
		//        deal to leave this as it is.
		if(num === -1) {
			this.conf.x = this.parseCoord(x, 'x');
			this.conf.y = this.parseCoord(y, 'y');
		} else {
			var old  = this.conf.x.split(',');
			old[num] = this.parseCoord(x, 'x');
			this.conf.x = old.join(',');

			old  = this.conf.y.split(',');
			old[num] = this.parseCoord(y, 'y');
			this.conf.y = old.join(',');
			old = null;
		}
	},

	// Transform the current coords to relative
	// coords to the given object
	makeRelativeCoords: function(oParent, num) {
		var xParent = this.getCoordParent(this.conf.x, num);
		var yParent = this.getCoordParent(this.conf.y, num);

		var x = num === -1 ? this.conf.x : this.conf.x.split(',')[num];
		var y = num === -1 ? this.conf.y : this.conf.y.split(',')[num];

		if(isRelativeCoord(x) && isRelativeCoord(y)) {
			// Skip this when already relative to the same object
			if(xParent == oParent.conf.object_id
			  && yParent == oParent.conf.object_id)
				return;

			// If this object was attached to another parent before, remove the attachment
			if(xParent != oParent.conf.object_id) {
				var o = getMapObjByDomObjId(xParent);
				if(o) {
				    o.delChild(this);
				    o = null;
				}
			}
			if(yParent != oParent.conf.object_id) {
				var o = getMapObjByDomObjId(yParent);
				if(o) {
				    o.delChild(this);
				    o = null;
				}
			}
		}

		// Add this object to the new parent
		oParent.addChild(this);

		// FIXME: Maybe the parent object is also a line. Then -1 is not correct
		//        But it is not coded to attach relative objects to lines. So it is no big
		//        deal to leave this as it is.
		if(num === -1) {
			this.conf.x = this.getRelCoords(oParent, this.parseCoord(this.conf.x, 'x'), 'x', -1);
			this.conf.y = this.getRelCoords(oParent, this.parseCoord(this.conf.y, 'y'), 'y', -1);
		} else {
			var newX = this.getRelCoords(oParent, this.parseCoords(this.conf.x, 'x')[num], 'x', -1);
			var newY = this.getRelCoords(oParent, this.parseCoords(this.conf.y, 'y')[num], 'y', -1);

			var old  = this.conf.x.split(',');
			old[num] = newX;
			this.conf.x = old.join(',');

			old  = this.conf.y.split(',');
			old[num] = newY;
			this.conf.y = old.join(',');
		}
	},

	/**
	 * Returns the object id of the parent object
	 */
	getCoordParent: function(val, num) {
		var coord = num === -1 ? val.toString() : val.split(',')[num].toString();
		return coord.search('%') !== -1 ? coord.split('%')[0] : coord;
	},

	getRelCoords: function(refObj, val, dir, num) {
		var refPos = num === -1 ? refObj.conf[dir] : refObj.conf[dir].split(',')[num];
		var offset = parseInt(val) - parseInt(refObj.parseCoord(refPos, dir));
		var pre    = offset >= 0 ? '+' : '';
		val        = refObj.conf.object_id + '%' + pre + offset;
		refObj     = null;
		return val;
	},

	/**
	 * Calculates new coordinates for the object where the given parameter
	 * 'val' is the integer representing the current position of the object
	 * in absolute px coordinates. If the object position is related to
	 * another object this function detects it and transforms the abslute px
	 * coordinate to a relative coordinate and returns it.
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	calcNewCoord: function(val, dir, num) {
		if(!isset(num))
			var num = -1;

		var oldVal = num === -1 ? this.conf[dir] : this.conf[dir].split(',')[num];
		// Check if the current value is an integer or a relative coord
		if(isset(oldVal) && isRelativeCoord(oldVal)) {
			// This must be an object id
			var objectId = null;
			if(oldVal.search('%') !== -1)
				objectId = oldVal.split('%')[0];
			else
				objectId = oldVal;

			// Only an object id. Get the coordinate and return it
			var refObj = getMapObjByDomObjId(objectId);
			// FIXME: Maybe the parent object is also a line. Then -1 is not correct
			if(refObj)
				val = this.getRelCoords(refObj, val, dir, -1);
			objectId = null;
		}
		oldVal = null;

		if(num === -1) {
			return val;
		} else {
			var old  = this.conf[dir].split(',');
			old[num] = val;
			return old.join(',');
		}
	},

	/**
	 * Used to gather all referenced parent object ids from the object
	 * configuration. Returns a object where the keys are the gathered
	 * parent object ids.
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	getParentObjectIds: function(num) {
		var parentIds = {};

		if(isset(num))
		    var coords = (this.conf['x'].split(',')[num] + ',' + this.conf['y'].split(',')[num]).split(',');
		else
		    var coords = (this.conf.x + ',' + this.conf.y).split(',');

		for(var i = 0, len = coords.length; i < len; i++)
			if(isRelativeCoord(coords[i]))
				if(coords[i].search('%') !== -1)
					parentIds[coords[i].split('%')[0]] = true;
				else
					parentIds[coords[i]] = true;
		coords = null;

		return parentIds;
	},

	/**
	 * Returns the coord indexes which use a specific parent object_id
	 */
	getRelativeCoordsUsingParent: function(parentId) {
	    var matches = {};
	    for(var i = 0, len = this.conf.x.split(',').length; i < len; i++) {
		if(this.getCoordParent(this.conf.x, i) === parentId && !isset(matches[i]))
		    matches[i] = true;
		else if(this.getCoordParent(this.conf.y, i) === parentId && !isset(matches[i]))
		    matches[i] = true;
	    }
	    return matches;
	},

	/**
	 * This is used to add a child item to the object. Child items are
	 * gathered automatically by the frontend. Child positions depend
	 * on the related parent position on the map -> relative positioning.
	 *
	 * @author  Lars Michelsen <lars@vertical-visions.de>
	 */
	addChild: function(obj) {
		if(this.childs.indexOf(obj) === -1)
			this.childs.push(obj);
		obj = null;
	},

	delChild: function(obj) {
		this.childs.splice(this.childs.indexOf(obj), 1);
		obj = null;
	},

	/**
	 * This method removes all attached map objects and make their coordinates
	 * absolute.
	 *
	 * Find the coords which have a relative coord and are using
	 * this object id as parent object. Then make these coordinates
	 * absolute using child.makeAbsoluteCoords(num).
	 * After that the change must be sent to the core using saveObject...
	 */
	detachChilds: function() {
	    for(var i = this.childs.length - 1; i >= 0; i--) {
		var nums = this.childs[i].getRelativeCoordsUsingParent(this.conf.object_id);
		var obj = this.childs[i];

		for(var num in nums) {
		    obj.makeAbsoluteCoords(num);
		}

		saveObjectAttr(obj.conf.object_id, {'x': obj.conf.x, 'y': obj.conf.y });

		obj  = null;
		nums = null;
	    }
	},

	/**
	 * Moves the icon to it's location as described by this js object
	 *
	 * @author	Lars Michelsen <lars@vertical-visions.de>
	 */
	moveIcon: function () {
		var container = document.getElementById(this.conf.object_id + '-icondiv');
		container.style.top  = this.parseCoord(this.conf.y, 'y') + 'px';
		container.style.left = this.parseCoord(this.conf.x, 'x') + 'px';
		container = null;
	},

	/**
	 * Entry point for repositioning objects in NagVis frontend
	 * Handles whole redrawing of the object while moving
	 *
	 * Author: Lars Michelsen <lars@vertical-visions.de>
	 */
	reposition: function() {
		if(this.conf.view_type === 'line' || this.conf.type === 'line')
			this.drawLine();
		else if(this.conf.type === 'textbox')
			this.moveBox();
		else
			this.moveIcon();

		// Move the objects label when enabled
		if(this.conf.label_show && this.conf.label_show == '1')
			this.moveLabel();

		// Move child objects
		for(var i = 0, l = this.childs.length; i < l; i++)
			this.childs[i].reposition();

		// redraw the controls
		if(!this.bIsLocked) {
			if(typeof(this.removeControls) == 'function')
			    this.removeControls();
			if(typeof(this.parseControls) == 'function')
			    this.parseControls();
		}
	},

	/*** CONTROL FUNCTIONS ***/

	parseControls: function () {
		// Ensure the controls container exists
		var oControls = document.getElementById(this.conf.object_id+'-controls');
		if(!oControls) {
			oControls = document.createElement('div');
			oControls.setAttribute('id', this.conf.object_id+'-controls');
			this.parsedObject.appendChild(oControls);
		}
		oControls = null;
		
		if(this.conf.view_type === 'line' || this.conf.type === 'line')
			this.parseLineControls();
		else if(this.conf.view_type === 'icon')
			this.parseIconControls();
		else if(this.conf.type === 'textbox')
			this.parseBoxControls();
		else if(this.conf.type === 'shape')
			this.parseShapeControls();
	},

	addControl: function (obj) {
		// Add to DOM
		document.getElementById(this.conf.object_id+'-controls').appendChild(obj);
		// Add to controls list
		this.objControls.push(obj);
	},

	parseLineControls: function () {
		var x = this.parseCoords(this.conf.x, 'x');
		var y = this.parseCoords(this.conf.y, 'y');

		var size = 20;
		for(var i = 0, l = x.length; i < l; i++) {
			this.parseControlDrag(i, x[i], y[i], - size / 2, - size / 2, size);
			makeDragable([this.conf.object_id+'-drag-'+i], this.saveObject, this.moveObject);
		}

		this.parseControlDelete(x.length, this.getLineMid(this.conf.x, 'x'), this.getLineMid(this.conf.y, 'y'),
		                        15, -15, 10);
		this.parseControlModify(x.length+1, this.getLineMid(this.conf.x, 'x'), this.getLineMid(this.conf.y, 'y'),
		                        30, -15, 10);

		size = null;
		x = null;
		y = null;
	},

	getLineMid: function(coord, dir) {
	    var c = coord.split(',');
	    if(c.length == 2)
		return middle(this.parseCoords(coord, dir)[0],
		              this.parseCoords(coord, dir)[1],
			      this.conf.line_cut);
	    else
		return this.parseCoords(coord, dir)[1];
	},

	removeControls: function() {
		var oControls = document.getElementById(this.conf.object_id+'-controls');
		if(oControls)
			for(var i = oControls.childNodes.length; i > 0; i--)
				oControls.removeChild(oControls.childNodes[0]);
		this.objControls = [];
		oControls = null;

		if(this.conf.type === 'textbox')
		    this.removeBoxControls();
	},

	parseControlDrag: function (num, objX, objY, offX, offY, size) {
		var drag = document.createElement('div');
		drag.setAttribute('id',         this.conf.object_id+'-drag-' + num);
		drag.setAttribute('class',     'control drag' + size);
		drag.setAttribute('className', 'control drag' + size);
		drag.style.zIndex   = parseInt(this.conf.z)+1;
		drag.style.width    = size + 'px';
		drag.style.height   = size + 'px';
		drag.style.left     = (objX + offX) + 'px';
		drag.style.top      = (objY + offY) + 'px';
		drag.objOffsetX     = offX;
		drag.objOffsetY     = offY;

		drag.onmouseover = function() {
		    document.body.style.cursor = 'move';
		};

		drag.onmouseout = function() {
		    document.body.style.cursor = 'auto';
		};

		this.addControl(drag);
		drag = null;
	},

	/**
	 * Adds the delete button to the controls including
	 * all eventhandlers
	 *
	 * Author: Lars Michelsen <lm@larsmichelsen.com>
	 */
	parseControlDelete: function (num, objX, objY, offX, offY, size) {
		var ctl= document.createElement('div');
		ctl.setAttribute('id',         this.conf.object_id+'-delete-' + num);
		ctl.setAttribute('class',     'control delete' + size);
		ctl.setAttribute('className', 'control delete' + size);
		ctl.style.zIndex   = parseInt(this.conf.z)+1;
		ctl.style.width    = size + 'px';
		ctl.style.height   = size + 'px';
		ctl.style.left     = (objX + offX) + 'px';
		ctl.style.top      = (objY + offY) + 'px';
		ctl.objOffsetX     = offX;
		ctl.objOffsetY     = offY;

		ctl.onclick = function() {
		    // In the event handler this points to the ctl object
		    var arr   = this.id.split('-');
		    var objId = arr[0];
		    var obj = getMapObjByDomObjId(objId);

		    // FIXME: Multilanguage
		    if(!confirm('Really delete the object?'))
			return;

		    obj.saveObject(this, null);
		    obj.remove();
		    obj   = null;
		    objId = null;
		    arr   = null;

		    document.body.style.cursor = 'auto';
		};

		ctl.onmouseover = function() {
		    document.body.style.cursor = 'pointer';
		};

		ctl.onmouseout = function() {
		    document.body.style.cursor = 'auto';
		};

		this.addControl(ctl);
		ctl = null;
	},

	/**
	 * Adds the modify button to the controls including
	 * all eventhandlers
	 *
	 * Author: Lars Michelsen <lm@larsmichelsen.com>
	 */
	parseControlModify: function (num, objX, objY, offX, offY, size) {
		var ctl= document.createElement('div');
		ctl.setAttribute('id',         this.conf.object_id+'-modify-' + num);
		ctl.setAttribute('class',     'control modify' + size);
		ctl.setAttribute('className', 'control mdoify' + size);
		ctl.style.zIndex   = parseInt(this.conf.z)+1;
		ctl.style.width    = size + 'px';
		ctl.style.height   = size + 'px';
		ctl.style.left     = (objX + offX) + 'px';
		ctl.style.top      = (objY + offY) + 'px';
		ctl.objOffsetX     = offX;
		ctl.objOffsetY     = offY;

		ctl.onclick = function() {
		    // In the event handler this points to the ctl object
		    var arr   = this.id.split('-');
		    var objId = arr[0];
		    var obj = getMapObjByDomObjId(objId);

		    showFrontendDialog(oGeneralProperties.path_server
		                       +'?mod=Map&act=addModify&do=modify&show='
				       +escapeUrlValues(oPageProperties.map_name)
				       +'&type='+escapeUrlValues(obj.conf.type)
				       +'&id=' + escapeUrlValues(objId), 'Modify Object');

		    obj   = null;
		    objId = null;
		    arr   = null;

		    document.body.style.cursor = 'auto';
		};

		ctl.onmouseover = function() {
		    document.body.style.cursor = 'pointer';
		};

		ctl.onmouseout = function() {
		    document.body.style.cursor = 'auto';
		};

		this.addControl(ctl);
		ctl = null;
	},


	/**
	 * Handler for the move event
	 *
	 * Important: This is called from an event handler
	 * the 'this.' keyword can not be used here.
	 */
	moveObject: function(obj) {
		var arr        = obj.id.split('-');
		var objId      = arr[0];
		var anchorType = arr[1];

		var newPos;
		var viewType = getDomObjViewType(objId);

		var jsObj = getMapObjByDomObjId(objId);

		if(viewType === 'line') {
			newPos = getMidOfAnchor(obj);

			// Get current positions and replace only the current one
			var anchorId   = arr[2];
			newPos = [ jsObj.calcNewCoord(newPos[0], 'x', anchorId),
			           jsObj.calcNewCoord(newPos[1], 'y', anchorId) ];

			var parents = jsObj.getParentObjectIds(anchorId);

			anchorId   = null;
		} else {
			newPos = [ jsObj.calcNewCoord(obj.x - obj.objOffsetX, 'x'),
			           jsObj.calcNewCoord(obj.y - obj.objOffsetY, 'y') ];

			var parents = jsObj.getParentObjectIds();
		}
		
		// Highlight parents when relative
		for (var objectId in parents) {
		    var p = getMapObjByDomObjId(objectId);
		    if(p) 
			p.highlight(true);
		    p = null;
		}
		parents = null;

		jsObj.conf.x = newPos[0];
		jsObj.conf.y = newPos[1];

		jsObj.reposition();

		jsObj      = null;	
		objId      = null;
		anchorType = null;
		newPos     = null;
		viewType   = null;
	},

	/**
	 * Handler for the drop event
	 *
	 * Important: This is called from an event handler
	 * the 'this.' keyword can not be used here.
	 */
	saveObject: function(obj, oParent) {
		var arr        = obj.id.split('-');
		var objId      = arr[0];
		var anchorId   = arr[2];
		var viewType   = getDomObjViewType(objId);
		var jsObj      = getMapObjByDomObjId(objId);

		if(viewType !== 'line')
			anchorId = -1;

		// Honor the enabled grid and reposition the object after dropping
		if(oViewProperties.grid_show === 1) {
		    if(viewType === 'line') {
			var pos = coordsToGrid(jsObj.parseCoords(jsObj.conf.x, 'x')[anchorId],
			                       jsObj.parseCoords(jsObj.conf.y, 'y')[anchorId]);
			jsObj.conf.x = jsObj.calcNewCoord(pos[0], 'x', anchorId);
			jsObj.conf.y = jsObj.calcNewCoord(pos[1], 'y', anchorId);
			pos = null;
		    } else {
			var pos = coordsToGrid(jsObj.parseCoord(jsObj.conf.x, 'x'),
			                       jsObj.parseCoord(jsObj.conf.y, 'y'));
			jsObj.conf.x = jsObj.calcNewCoord(pos[0], 'x');
			jsObj.conf.y = jsObj.calcNewCoord(pos[1], 'y');
			pos = null;
		    }
		    jsObj.reposition();
		}

		// Make relative when oParent set and not already relative
		if(isset(oParent))
			if(oParent !== false)
				jsObj.makeRelativeCoords(oParent, anchorId);
			else
				jsObj.makeAbsoluteCoords(anchorId);

		saveObjectAfterAnchorAction(obj);

		// Remove the dragging hand after dropping
		document.body.style.cursor = 'auto';

		arr      = null;
		objId    = null;
		anchorId = null;
		jsObj    = null;
	},


	highlight: function(show) {}
});
