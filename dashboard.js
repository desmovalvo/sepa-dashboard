$(function(){

    var subscriptions = {};

    ////////////////////////////////////////////////////////////////////////////////
    //
    // BUILD PREFIX SECTION FUNCTION
    //
    ////////////////////////////////////////////////////////////////////////////////

    function build_prefix_section(){
	ps = "";
	for (record in w2ui['nsGrid'].records){
	    ps = ps + "PREFIX " + w2ui['nsGrid'].records[record]["prefix"] + ": <" + w2ui['nsGrid'].records[record]["namespace"] + ">\n";
	}
	return ps;
    };

    ////////////////////////////////////////////////////////////////////////////////
    //
    // LOG FUNCTION
    //
    ////////////////////////////////////////////////////////////////////////////////

    function log(level, text){
	
	t = new Date();
	msg = "[" + t.toTimeString() + "][" + level + "] " + text;
	$("#debugText").empty();
	$("#debugText").text(msg);
	console.log(msg);

    };   

    ////////////////////////////////////////////////////////////////////////////////
    //
    // TOP LAYOUT
    //
    ////////////////////////////////////////////////////////////////////////////////

    // TopLayout section
    $('#topLayout').w2layout({
        name: 'topLayout',
        panels: [
            { type: 'left', size: '50%', content: '<div id="sapForm" style="height: 100%;"></div>', style: 'margin: 5px;' },
            { type: 'right', size: '50%', content: 'right', style: 'margin: 5px;' },
        ]
    });

    // SAP form -- HTML
    var sapFormHtmlCode = "<div class='w2ui-page page-0'>" +
        "<div class='w2ui-field'><label>Load SAP File:</label>" +
        "<div><input id='sapFile' type='file'/></div>" +
        "</div>" +
	"</div>" +
	"<div class='w2ui-buttons'>" +
        "<button class='w2ui-btn' name='loadSapBtn'><i class='fa fa-upload' aria-hidden='true'></i>&nbsp;Load</button>" +
        "<button class='w2ui-btn' name='clearBtn'><i class='fa fa-trash' aria-hidden='true'></i>&nbsp;Clear</button>" +
	"</div>";

    // SAP form -- W2UI
    $('#sapForm').w2form({
        name  : 'sapFormJs',
	formHTML: sapFormHtmlCode,
        fields: [
    	    { field: 'sapFile', type: 'file' },
        ],
        actions: {
	    clearBtn: function(event){

		// clear the namespaces grid
		w2ui['nsGrid'].clear();

		// clear the namespace and prefix text entries
		$('#Prefix').val("");		
		$('#Namespace').val("");

		// clear the update/query grid
		w2ui['uGrid'].clear();

		// clear the update/query forced bindings grid
		w2ui['ufbGrid'].clear();

		// clear the update/query form
		$('#updateHost').val("");
		$('#updateText').val("");

		// clear the update/query grid
		w2ui['sGrid'].clear();

		// clear the update/query forced bindings grid
		w2ui['sfbGrid'].clear();

		// clear the update/query form
		$('#queryHost').val("");
		$('#subscribeHost').val("");
		$('#subText').val("");

		// clear the sub results area
		w2ui['abGrid'].clear();
		w2ui['rbGrid'].clear();
		
		// if no subscriptions are active
		// remove all the columns from the grids
		if (Object.keys(subscriptions).length === 0){

		    // get the number of columns
		    columns = [];
		    for (column in w2ui["abGrid"].columns){
			columns.push(w2ui["abGrid"].columns[column]["field"]);
		    }

		    // remove all the columns but subid
		    for (column = 0; column < columns.length ; column++ ){
			if (columns[column].localeCompare("subid") !== 0){
			    w2ui["abGrid"].removeColumn(columns[column]);
			    w2ui["rbGrid"].removeColumn(columns[column]);
			}
		    }		    
		}
		
		// clear the query results grid
		w2ui['qGrid'].clear();

		// clear debug area
		$("#debugText").empty();

		// debug
		log("INFO", "Cleaning completed!");

	    },
            loadSapBtn: function (event) {

		// check if file reader is supported
		if ( ! window.FileReader ) {
		    alarm( 'FileReader API is not supported by your browser.' );
		    log("ERROR", 'FileReader API is not supported by your browser.' );
		    return false;
		}

		// load data
		var $i = $( '#sapFile' );		
		input = $i[0];
		if ( input.files && input.files[0] ) {
		    file = input.files[0];

		    // create a mew instance of the file reader
		    fr = new FileReader();		    
		    var text;
		    fr.onload = function () {

			// read the content of the file
			var decodedData = fr.result;
		
			// parse the JSON file
			myJson = JSON.parse(decodedData);
			
			// retrieve namespaces
			for (ns in myJson["namespaces"]){

			    // get the current number of items in the grid
			    var g = w2ui['nsGrid'].records.length;	
			    
			    // add the element to the grid
			    w2ui['nsGrid'].add({recid: g+1, prefix: ns, namespace: myJson["namespaces"][ns]});
			}			 
			
			// retrieve subscriptions
			for (sname in myJson["subscribes"]){

			    // forced bindings
			    fbsection = myJson["subscribes"][sname]["forcedBindings"];
			    var fbindings = [];
			    for (variable in fbsection){
				fbindings.push({"variable": variable, 
						"value": myJson["subscribes"][sname]["forcedBindings"][variable]["value"],
						"type": myJson["subscribes"][sname]["forcedBindings"][variable]["type"]})
			    };

			    // query text
			    stext = myJson["subscribes"][sname]["sparql"];

			    // get the current number of items in the grid
			    var g = w2ui['sGrid'].records.length;	

			    // add the element to the grid
			    w2ui['sGrid'].add({recid: g+1, subscribe: sname, forcedBindings: JSON.stringify(fbindings), subscribeText: stext });
			}			 			

			// retrieve updates
			for (uname in myJson["updates"]){

			    // forced bindings
			    fbsection = myJson["updates"][uname]["forcedBindings"];
			    var fbindings = [];
			    for (variable in fbsection){
				fbindings.push({"variable": variable, 
						"value": myJson["updates"][uname]["forcedBindings"][variable]["value"],
						"type": myJson["updates"][uname]["forcedBindings"][variable]["type"]});
			    };

			    // update text
			    utext = myJson["updates"][uname]["sparql"];

			    // get the current number of items in the grid
			    var g = w2ui['uGrid'].records.length;	

			    // add the element to the grid
			    w2ui['uGrid'].add({recid: g+1, updateName: uname, forcedBindings: JSON.stringify(fbindings), updateText: utext });
			}			 			

			// retrieve host
			host = myJson["parameters"]["host"];

			// retrieve ports
			subscribePort = myJson["parameters"]["ports"]["ws"];
			updatequeryPort = myJson["parameters"]["ports"]["http"];

			// retrieve paths
			subscribePath = myJson["parameters"]["paths"]["subscribe"];
			updatePath = myJson["parameters"]["paths"]["update"];
			queryPath = myJson["parameters"]["paths"]["query"];

			// retrieve values for subscribe
			$('#subscribeHost').val("ws://" + host + ":" + subscribePort + "/" + subscribePath);
			$('#updateHost').val("http://" + host + ":" + updatequeryPort + "/" + updatePath);
			$('#queryHost').val("http://" + host + ":" + updatequeryPort + "/" + queryPath);

			// // retrieve sepa host		   
			// $xml.find("parameters").each(function(){

			//     // retrieve prefix and namespace
			//     url = $(this).attr('url');
			//     httpport = $(this).attr('updatePort');
			//     wsport = $(this).attr('subscribePort');
			//     path = $(this).attr('path');
			    
			//     // build http url
			//     httpUrl = "http://" + url + ":" + httpport + path;
			//     $('#updateHost').val(httpUrl);
			//     $('#queryHost').val(httpUrl);

			//     // build ws url
			//     wsUrl = "ws://" + url + ":" + wsport + path;
			//     $('#subscribeHost').val(wsUrl);

			    
			// });

		    };
		    fr.readAsText(file);

		    // debug
		    log("INFO", "File parsing completed!");
		    
		} else {
		    // Handle errors here
		    alert("File not selected or browser incompatible.");
		    log("ERROR", "File not selected or browser incompatible.");
		}
	    }	    
        }
    });

    // NS popup - HTML
    nsFormPopupHtml = "<div id='nsFormPopup'>" +
	"<div class='w2ui-page page-0'>" + 
        "<div class='w2ui-field'><label>Prefix:</label>" +
	"<div><input name='prefixEntry' type='text'></div></div>" +
        "<div class='w2ui-field'><label>Namespace:</label>" +
	"<div><input name='namespaceEntry' type='text'></div></div>" +
	"</div>" + 
	"<div class='w2ui-buttons'>" +
        "<button class='w2ui-btn' name='add'>Add</button>" +
        "<button class='w2ui-btn' name='query'><i class='fa fa-trash' aria-hidden='true'></i>&nbsp;Delete</button>" +
	"</div></div>";

    // NS popup - W2UI
    var popupNsConfig = {
	layout: {
            name: 'popupNsLayout',
            padding: 0,
            panels: [
		{ type: 'main', content: '<div id="nsFormPopup"></div>', style: 'margin: 5px;' }
            ]
	},
	form: {
            name  : 'popupNsForm',
	    formHtml : nsFormPopupHtml,
            fields: [
    		{ field: 'prefixEntry', type: 'text', name: 'Prefix'},
    		{ field: 'namespaceEntry',  type: 'text', name: 'Namespace' },
            ],
            actions: {
		'Add': function (event) {
		    
		    // retrieve prefix and namespace
		    var p = $('#Prefix').val();		
		    var n = $('#Namespace').val();

		    // get the current number of items in the grid
		    var g = w2ui['nsGrid'].records.length;	

		    // add the element to the grid
		    w2ui['nsGrid'].add({recid: g+1, prefix: p, namespace: n});

		    // debug
		    log("INFO", "Added prefix " + p + " (" + n + ")");		    
		},	    
	    }
	}
    };
    $().w2layout(popupNsConfig.layout);
    $("#nsFormPopup").w2form(popupNsConfig.form);

    // namespaces grid
    $().w2grid({	
	name: 'nsGrid',	
	show: {
	    toolbar: true,
	    toolbarDelete: true,
	    toolbarAdd: true,
	},
	columns: [
	    { field: 'prefix', caption: 'Prefix', size: '20%' },
	    { field: 'namespace', caption: 'Namespace', size: '80%' }
	],
	onAdd: function(event){
	    w2popup.open({
		title   : 'nsPopup',
		showMax : true,
		body    : '<div id="main" style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px;"></div>',
		onOpen  : function (event) {
		    event.onComplete = function () {
			$('#w2ui-popup #main').w2render('popupNsLayout');
			w2ui.popupNsLayout.content('main', w2ui.popupNsForm);
		    }
		},
		onToggle: function (event) { 
		    event.onComplete = function () {
			w2ui.layout.resize();
		    }
		}        
	    });
	},
	onClick: function(event){

	    // retrieve the namespace
	    nsItem = w2ui['nsGrid'].get(event["recid"]);

	    // fill fields on the right
	    $('#Prefix').val(nsItem["prefix"]);		
	    $('#Namespace').val(nsItem["namespace"]);	    

	    // debug
	    log("INFO", "Selected prefix " + nsItem["prefix"] + "(namespace " + nsItem["namespace"] + ")");

	}
    });
    w2ui['topLayout'].content('right', w2ui['nsGrid']);

    
    ////////////////////////////////////////////////////////////////////////////////
    //
    // UPDATE/QUERY/SUBSCRIBE LAYOUT
    //
    ////////////////////////////////////////////////////////////////////////////////
    
    // uqs section
    $('#uqsSection').w2layout({
        name: 'uqsLayout',
	style: 'radius: 10px; padding: 5px; height: 580px;',
        panels: [
            { type: 'left', size: '50%', content: 'left', style: 'margin: 5px; margin-top: 0px; margin-left: 0px;' },
            { type: 'right', size: '50%', content: 'right', style: 'margin: 5px; margin-top: 0px; margin-right: 0px;' },	    
        ]
    });
    
    ////////////////////////////////////////////////////////////////////////////////
    //
    // UPDATE LAYOUT
    //
    ////////////////////////////////////////////////////////////////////////////////
    
    // update layout
    $().w2layout({
        name: 'updateLayout',
	style: 'border-radius: 10px; padding: 5px; 100%;',
        panels: [
            { type: 'left', size: '50%', content: 'left', style: 'margin: 5px; margin-top: 0px; margin-left: 0px;' },
            { type: 'right', size: '50%', content: 'right', style: 'margin: 5px; margin-top: 0px; margin-right: 0px;' },
	    { type: 'bottom', size: '50%', content: '<div id="uForm"></div>', style: 'margin: 5px; border-style: none;' },
        ]
    });   
    w2ui['uqsLayout'].content('left', w2ui['updateLayout']);

    // update form -- HTML
    updateForm = "<div id='updateForm' style='width: 750px;'>" +
	"<div class='w2ui-page page-0'>" + 
        "<div class='w2ui-field'><label>Update Host:</label><div>" +
        "<input type='text' value='http://localhost:8000/sparql' name='updateHost' style='width: 385px;'></div></div>" +
        "<div class='w2ui-field'><label>Text:</label><div>" +
        "<textarea name='updateText' type='text' style='width: 385px; height: 80px; resize: none'></textarea></div></div>" +
        "</div>" +
	"<div class='w2ui-buttons'>" +
        "<button class='w2ui-btn' name='update'><i class='fa fa-pencil' aria-hidden='true'></i>&nbsp;Update</button>" +
	"</div></div>"    

    // update form -- W2UI
    $().w2form({
	name: 'uForm',
	formHTML: updateForm,
	fields: [
	    { name: 'updateHost', type: 'text' },
	    { name: 'updateText', type: 'text'}	    
	],
	actions: {
	    update: function(){

		// get the HTTP host
		httpHost = $('#updateHost').val();
		
		// sparql update
		update = build_prefix_section() + $('#updateText').val();

		// do an HTTP POST request
		var req = $.ajax({
		    url: httpHost,
		    crossOrigin: true,
		    method: 'POST',
		    contentType: "application/sparql-update",
		    data: update,	
		    statusCode: {
			200: function(){
			    log("INFO", "UPDATE Request Successful (200 OK)");
			}
		    }
		});

	    },
	}
    });
    w2ui['updateLayout'].content('bottom', w2ui['uForm']);
    
    // updates list
    $().w2grid({	
	name: 'uGrid',	
	columns: [
	    { field: 'updateName', caption: 'SPARQL Update', size: '100%' },
	    { field: 'forcedBindings', caption: 'Forced variables', hidden: true },
	    { field: 'updateText', hidden: true }
	],
	onClick: function(event){

	    // retrieve the event
	    uqItem = w2ui['uGrid'].get(event["recid"]);

	    // clear the forced bindings grid	    
	    w2ui['ufbGrid'].clear();

	    // fill
	    var g = w2ui['ufbGrid'].records.length;	
	    bindings = JSON.parse(uqItem["forcedBindings"]);
	    bindings.forEach(function(element){
		g = g+1;
	    	w2ui['ufbGrid'].add({recid: g+1, uvariable: element["variable"], uliteral: element["type"], uvalue: element["value"]});		
	    });

	    // fill the text area
	    $('#updateText').val(uqItem["updateText"]);

	    // debug
	    log("INFO", "Selected update/query " + uqItem["updateName"]);

	}
    });
    w2ui['updateLayout'].content('left', w2ui['uGrid']);

    // update forced bindings grid
    $().w2grid({	
	name: 'ufbGrid',	
	columns: [
	    { field: 'uvariable', caption: 'Variable', size: '35%' },
	    { field: 'uvalue', caption: 'Value', size: '35%', editable: {type:'text'} },
	    { field: 'uliteral', caption: 'Literal', size: '30%' }
	],
	onChange: function(event){

	    // get the new value
	    new_value = event.value_new;

	    // get the modified variable
	    modified_variable = w2ui['ufbGrid'].get(event["recid"])["uvariable"];

	    // retrieve the original query
	    uqItem = w2ui['uGrid'].get(w2ui['uGrid'].getSelection())[0];
	    leftrecid = uqItem["recid"];
	    original_query = uqItem["updateText"];
	    var query = original_query;

	    // update its field
	    new_uqItem = uqItem;	    
	    bindings = JSON.parse(uqItem["forcedBindings"]);
	    bindings.forEach(function(element){
		if (element["variable"] === modified_variable){
		    bindings[bindings.indexOf(element)]["value"] = new_value;
		}
	    });
	    new_uqItem["forcedBindings"] = JSON.stringify(bindings);
	    w2ui['uGrid'].set(leftrecid, new_uqItem);
	    
	    // update the query
	    bindings = JSON.parse(uqItem["forcedBindings"]);
	    bindings.forEach(function(element){
	    	if (element["value"] !== ""){
	    	    variable = "?" + element["variable"];
		    if (element["type"].localeCompare("literal") == 0)
			val = '"' + element["value"] + '"';
		    else val = element["value"];
	    	    query = query.split(variable).join(val);
	    	}
	    });
	    $('#updateText').val(query);

	    // debug
	    log("INFO", "Forced binding updated in Query/Update");
	    
	}
    });
    w2ui['updateLayout'].content('right', w2ui['ufbGrid']);

    ////////////////////////////////////////////////////////////////////////////////
    //
    // SUBSCRIBE LAYOUT
    //
    ////////////////////////////////////////////////////////////////////////////////
    
    $().w2layout({
        name: 'subscribeLayout',
	style: 'border-radius: 10px; padding: 5px;',
        panels: [
            { type: 'left', size: '50%', content: 'left', style: 'margin: 5px; margin-top: 0px; margin-left: 0px;' },
            { type: 'right', size: '50%', content: 'right', style: 'margin: 5px; margin-top: 0px; margin-right: 0px;' },
	    { type: 'bottom', size: '50%', content: '<div id="sForm"></div>', style: 'margin: 5px; border-style: none;' },
        ]
    });   
    w2ui['uqsLayout'].content('right', w2ui['subscribeLayout']);

    // subscribeForm -- HTML
    subscribeForm = "<div id='subscribeForm' style='width: 750px;'>" +
	"<div class='w2ui-page page-0'>" + 
        "<div class='w2ui-field'><label>Query Host:</label><div>" +
        "<input type='text' value='http://localhost:8000/sparql' name='queryHost' style='width: 385px;'></div></div>" +
	"<div class='w2ui-field'><label>Subscribe Host:</label><div>" +
        "<input type='text' value='ws://localhost:9000/sparql' name='subscribeHost' style='width: 385px;'></div></div>" +
        "<div class='w2ui-field'>" +
        "<label>Text:</label>" +
	"<div>" +
        "<textarea name='subText' type='text' style='width: 385px; height: 80px; resize: none'></textarea></div></div>" +
	"<div class='w2ui-field'><label>Active Subs:</label>" +
	"<div><input type='list'  name='activeSubs' style='width: 385px;'></div></div>" +
        "</div>" +
	"<div class='w2ui-buttons'>" +
	"<button class='w2ui-btn' name='query'><i class='fa fa-question' aria-hidden='true'></i>&nbsp;Query</button>" +
        "<button class='w2ui-btn' name='subscribe'><i class='fa fa-chain' aria-hidden='true'></i>&nbsp;Subscribe</button>" +
        "<button class='w2ui-btn' name='unsubscribe'><i class='fa fa-chain-broken' aria-hidden='true'></i>&nbsp;Unsubscribe</button>" +
	"</div></div>"    

    // subscribe form -- W2UI
    $().w2form({
	name: 'sForm',
	formHTML: subscribeForm,
	fields: [
	    { name: 'queryHost', type: 'text' },
	    { name: 'subscribeHost', type: 'text'},
	    { name: 'subText', type: 'text'},
	    { name: 'activeSubs', type: 'list' }
	],
	actions: {
	    query: function(){

		// initialize data
		var output = null;

		// get the HTTP host
		httpHost = $('#queryHost').val();
		
		// sparql query
		query = build_prefix_section() + $('#subText').val();
		console.log(query);

		// do an HTTP POST request
		var req = $.ajax({
		    url: httpHost,
		    crossOrigin: true,
		    method: 'POST',
		    contentType: "application/sparql-query",
		    data: query,	
		    error: function(event){
			w2alert("Connection failed!");
			return false;
		    },
		    success: function(data){

			    // retrieve the output
			    log("INFO", "QUERY Request Successful (200 OK)");
			    output = JSON.parse(data);

			    // check if error occurred
			    if ("error" in output){
				w2alert(output["error"]["message"]);
				return false;
			    }
			    else w2alert("Query request successful");			    

			    // get the list of variables
			    variables = [];
			    console.log(output);
			    for (v in output["head"]["vars"]){
				variables.push(output["head"]["vars"][v]);				
			    }			 

			    // get the current number of columns
			    oldColNum = w2ui['qGrid'].columns.length;

			    // get the number of needed columns
			    newColNum = output["head"]["vars"].length;

			    // if needed > current: add column
			    if (newColNum > oldColNum){
				diff = newColNum - oldColNum;
				for (i=0; i<diff; i++){
				    w2ui['qGrid'].addColumn({ field: i.toString(), caption: 'temp', size: "0" });
				};				
			    } 
			    // else columns must be removed
			    else if (newColNum < oldColNum){
				diff =  oldColNum - newColNum;
				i = 0;
				w2ui['qGrid'].columns.forEach(function(column){
				    if (i < diff){
					w2ui['qGrid'].removeColumn(column["field"]);
					i++;
				    };
				});

			    } 
			    
			    // now resize and rename every column!
			    for (column in w2ui["qGrid"].columns){
				w2ui["qGrid"].columns[column]["field"] = variables[column];				
				w2ui["qGrid"].columns[column]["caption"] = "?" + variables[column];
			    }
			    w2ui["qGrid"].refresh();
			    
			    // fill every row
			    counter = 0;
			    for (row in output["results"]["bindings"]){
				r = new Object();
				r["recid"] = counter;
				counter++;
				for (v in variables){
				    r[variables[v]] = output["results"]["bindings"][row][variables[v]]["value"];
				}
				w2ui["qGrid"].add(r);
				
			    }
		    }
		});

	    },
	    subscribe: function(event){
		
		// init
		var subid = null;
		
		// retrieve subscription text
		wsText = build_prefix_section() + $("#subText").val();
		
		// retrieve host
		wsHost = $("#subscribeHost").val();

		// open connection 
		var ws = new WebSocket(wsHost);

		// send subscription
		ws.onopen = function(){
		    ws.send(JSON.stringify({"subscribe":wsText, "alias":"-"}));
		};

		// handler for received messages
		ws.onmessage = function(event){

		    // parse the message
		    msg = JSON.parse(event.data);

		    if (msg["subscribed"] !== undefined){

		    	// get the subscription id
		    	subid = msg["subscribed"];

			// store the subid
			$("#activeSubs").w2field()["options"]["items"].push({"id":subid, "text":subid});
			log("INFO", "Subscription " + subid + " started.");

		    	// store the socket
		    	subscriptions[subid] = ws;
			
		    } else if ("results" in msg)  {

			// get the variables
			variables = msg["results"]["head"]["vars"];

			// look if columns must be added
			columns = []
			for (column in w2ui["abGrid"].columns){
			    columns.push(w2ui["abGrid"].columns[column]["field"]);
			}
			for (v in variables){
			    if (columns.indexOf(variables[v]) === -1){
				w2ui["abGrid"].addColumn({ field: variables[v], caption: '?' + variables[v], size: "100%" });
				w2ui["rbGrid"].addColumn({ field: variables[v], caption: '?' + variables[v], size: "100%" });
				w2ui["abGrid"].refresh();
				w2ui["rbGrid"].refresh();
			    }
			}

		    	// added bindings
		    	added = msg["results"]["addedresults"];

			// fill the grid
			for (e in added["bindings"]){

			    g = w2ui['abGrid'].records.length;	
			    r = new Object;
			    r["recid"] = g+1;
			    r["subid"] = msg["spuid"];			    
			    for (k in added["bindings"][e]){
				r[k] = added["bindings"][e][k]["value"];
			    }
			    w2ui['abGrid'].add(r);
			}
			
		    	// removed bindings
		    	removed = msg["results"]["removedresults"];			

			// fill the grid
			for (e in removed["bindings"]){

			    g = w2ui['rbGrid'].records.length;	
			    r = new Object;
			    r["recid"] = g+1;
			    r["subid"] = msg["spuid"];			    
			    for (k in removed["bindings"][e]){
				r[k] = removed["bindings"][e][k]["value"];
			    }
			    w2ui['rbGrid'].add(r);
			}
		    }
		};

		// handler for the ws closing
		ws.onclose = function(event){
		    log("INFO", "Subscription " + subid + " closed.");
		};

	    },
	    unsubscribe: function(event){

		// get selected subscription
		subid = $("#activeSubs").data("selected")["id"];
		if (typeof(subid) !== "undefined"){

		    // retrieve the websocket
		    ws = subscriptions[subid];
		    ws.close();

		    // remove the sub from the dropdown list
		    items = [];
		    items_old = $("#activeSubs").w2field()["options"]["items"];
		    for (i in items_old){		    
			obid = items_old[i]["id"];
			if (obid !== subid){
			    item = new Object;
			    item["id"] = items_old[i]["id"];
			    item["text"] = items_old[i]["id"];
			    items.push(item);
			}
		    }
		    $("#activeSubs").data('selected', {}).change(); 
		    $("#activeSubs").w2field('list', {items: items} );
		    $("#activeSubs").w2field().refresh();
		    
		    // remove the subscription from the list
		    console.log(subscriptions);
		    console.log(subscriptions[subid]);
		    delete subscriptions[subid];
		    console.log(subscriptions);
		    
		    // debug
		    log("INFO", "Subscription " + subid + " closed");
		}
	    }
	}
    });
    w2ui['subscribeLayout'].content('bottom', w2ui['sForm']);
    
    // subscriptions list
    $().w2grid({	
	name: 'sGrid',	
	columns: [
	    { field: 'subscribe', caption: 'SPARQL Query/Subscription', size: "100%" },
	    { field: 'forcedBindings', caption: 'Forced variables', hidden: true },
	    { field: 'subscribeText', hidden: true },
	],
	onClick: function(event){

	    // retrieve the event
	    sItem = w2ui['sGrid'].get(event["recid"]);

	    // clear the forced bindings grid	    
	    w2ui['sfbGrid'].clear();

	    // fill
	    var g = w2ui['sfbGrid'].records.length;	
	    bindings = JSON.parse(sItem["forcedBindings"]);
	    bindings.forEach(function(element){
	    	w2ui['sfbGrid'].add({recid: g+1, svariable: element["variable"], sliteral: element["type"], svalue: element["value"]});		
	    });

	    // fill the text area
	    $('#subText').val(sItem["subscribeText"]);

	    // debug
	    log("INFO", "Selected subscription " + sItem["subscribe"]);
	    
	}
    });
    w2ui['subscribeLayout'].content('left', w2ui['sGrid']);

    // subscriptions forced bindings grid
    $().w2grid({	
	name: 'sfbGrid',	
	columns: [
	    { field: 'svariable', caption: 'Variable', size: '35%' },
	    { field: 'svalue', caption: 'Value', size: '35%',  editable: {type:'text'}  },
	    { field: 'sliteral', caption: 'Literal', size: '30%' }
	],
	onChange: function(event){

	    // get the new value
	    new_value = event.value_new;

	    // get the modified variable
	    modified_variable = w2ui['sfbGrid'].get(event["recid"])["svariable"];

	    // retrieve the original query
	    uqItem = w2ui['sGrid'].get(w2ui['sGrid'].getSelection())[0];
	    leftrecid = uqItem["recid"];
	    original_query = uqItem["subscribeText"];
	    var query = original_query;

	    // update its field
	    new_uqItem = uqItem;	    
	    bindings = JSON.parse(uqItem["forcedBindings"]);
	    bindings.forEach(function(element){
		if (element["variable"] === modified_variable){
		    bindings[bindings.indexOf(element)]["value"] = new_value;
		}
	    });
	    new_uqItem["forcedBindings"] = JSON.stringify(bindings);
	    w2ui['sGrid'].set(leftrecid, new_uqItem);
	    
	    // update the query
	    bindings = JSON.parse(uqItem["forcedBindings"]);
	    bindings.forEach(function(element){
	    	if (element["value"] !== ""){
	    	    variable = "?" + element["variable"];
		    if (element["type"].localeCompare("literal") == 0)
			val = '"' + element["value"] + '"';
		    else val = element["value"];
	    	    query = query.split(variable).join(val);
	    	}
	    });
	    $('#subText').val(query);

	    // debug
	    log("INFO", "Forced binding updated in Query/Subscription");
	    
	}

    });
    w2ui['subscribeLayout'].content('right', w2ui['sfbGrid']);    


    ////////////////////////////////////////////////////////////////////////////////
    //
    // RESULTS AREA
    //
    ////////////////////////////////////////////////////////////////////////////////

    // results layout
    $("#resultSection").w2layout({
        name: 'resultSectionLayout',
	style: 'border-radius: 10px; padding: 10px; padding-top:height: 400px;',
        panels: [
            { type: 'left', size: '50%', content: '<div id="resultSectionLeft"></div>', style: 'margin: 5px; margin-top: 0px; margin-left: 0px; height: 100%;' },
            { type: 'right', size: '50%', content: '<div id="resultSectionRight"></div>', style: 'margin: 5px; margin-top: 0px; margin-right: 0px; height: 100%;' },
        ]
    });

    // Added Bindings grid
    $('#addedBindingsGrid').w2grid({
	name: 'abGrid',	
	columns: [
	    { field: 'subid', caption: 'Sub ID', size: '33%' }
	],	
	show: {
	    toolbar: true
	},
	toolbar: {
	    items: [	   
		{id: "abGridClear", type:'button', caption: 'Clear'}
	    ],
	    onClick: function(event){
		if (event.target.localeCompare("abGridClear") === 0){
		    w2ui['abGrid'].clear();
		}
	    }
	}
    });

    // Removed Bindings grid
    $('#removedBindingsGrid').w2grid({
	name: 'rbGrid',	
	columns: [
	    { field: 'subid', caption: 'Sub ID', size: '33%' },	   
	],	
	show: {
	    toolbar: true
	},
	toolbar: {
	    items: [	   
		{id: "rbGridClear", type:'button', caption: 'Clear'}
	    ],
	    onClick: function(event){
		if (event.target.localeCompare("rbGridClear") === 0){
		    w2ui['rbGrid'].clear();
		}
	    }
	}	
    });

    // Query grid
    $('#queryGrid').w2grid({
	name: 'qGrid',	
	columns: [
	    { field: 's', caption: '?s', size: '33%' },
	    { field: 'p', caption: '?p', size: '33%' },
	    { field: 'o', caption: '?o', size: '34%' }
	],	
	show: {
	    toolbar: true
	},
	toolbar: {
	    items: [	   
		{id: "qGridClear", type:'button', caption: 'Clear'}
	    ],
	    onClick: function(event){
		if (event.target.localeCompare("qGridClear") === 0){
		    w2ui['qGrid'].clear();
		}
	    }
	}	
    });
    
});
