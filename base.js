// Connect two distinct nodes with a straight line
var connection_rule_straight = function(sp, tp) {
	return ['M', sp.x, sp.y, 'L', tp.x, tp.y].join(' ');
};

// Connect two distinct nodes with an arc
var connection_rule_arc = function(p1, p2) {
	
};

var connection_rule_self = function(sp, tp, selfCount) {
	var dx = Math.abs(tp.x - sp.x) * (selfCount + 0.5);
	var dy = Math.abs(tp.y - sp.y) * (selfCount + 0.5);
	var shiftx = tp.x - sp.x;
	var shifty = tp.y - sp.y;
	return ['M', sp.x, sp.y,
		'c', 40, -40, shiftx+40, shiftx-40, shiftx, shifty

//		'c', 10, 10, 30, 30,
		//'C', (sp.x + dx), (sp.y + dy), (tp.x + dx), (tp.y + dy),
		//shiftx, shifty
	].join(' ');
}

var connection_rule_spline = function(p1, p2) {};

var connection_rule_magic = function(sp, tp) {
	var d = [tp.x - sp.x, tp.y - sp.y];
	var l = Math.sqrt(d[0]*d[0] + d[1]*d[1]); // Length
	var ma = Math.max(d[0], d[1]);
	var mi = Math.min(d[0], d[1]);
	var f = Math.max(0.01, Math.min(0.5, Math.abs(ma / mi), Math.abs(mi / ma)));
	// Control point start being defined as center point
	var cp = [(sp.x + tp.x) * 0.5, (sp.y + tp.y) * 0.5];
	cp[0] = cp[0] - d[1] * f;
	cp[1] = cp[1] + d[0] * f;
	// p += sp.x + ' ' + sp.y + ' L ' + tp.x + ' ' + tp.y;
	return ['M', sp.x, sp.y, 'Q', cp[0], cp[1], tp.x, tp.y].join(' ');
}

var app = new Vue({
	el: '#app',
	data: {
		width: '100%', // SVG size
		height: 600, // SVG size
		messages: [], // List of messages for logging
		nodes: {}, // Nodes in the graph
		edges: {}, // Edges in the graph
		handlerSize: 10, // Size of handler on nodes
		// Info about current node being dragged
		drag: {
			capturedNode: null,
			page: {x: 0, y: 0},
			last: {x: 0, y: 0},
		},
		// Info about connection being created
		connect: {
			sourceNode: null,
			capturedHandler: null,
			last: {x: 0, y: 0},
		},
	},
	computed: {
		// Return last log messages
		last_messages: function() {
			return this.messages.slice(-15);
		},
		// Return a dictionary of handlers for each node
		handlers: function() {
			var globalh = Object.create(null);
			for (var nid in this.nodes) { //= 0; i < this.nodes.length; i++) {
				// For each node, compute a set of handlers
				var localh = [];
				var N = 4;
				var node = this.nodes[nid];
				// Top, right, bottom, left
				localh.push({x: node.x, y: node.y - node.h/2, r: this.handlerSize});
				localh.push({x: node.x + node.w/2, y: node.y, r: this.handlerSize});
				localh.push({x: node.x, y: node.y + node.h/2, r: this.handlerSize});
				localh.push({x: node.x - node.w/2, y: node.y, r: this.handlerSize});
				/*
				// circle handlers
				for (var j = 0; j < 2; j++) {
					var a = j * (Math.PI * 2.0) / 4;
					localh.push({
						x: this.nodes[nid].x + Math.cos(a) * this.nodes[nid].r,
						y: this.nodes[nid].y + Math.sin(a) * this.nodes[nid].r,
						r: this.handlerSize,
					})
				}
				*/
				globalh[nid] = localh;
			}
			return globalh;
		},
		// Return a list of paths to be drawn between nodes
		paths: function() {
			var edgePaths = [];
			for (var src in this.edges) {
				var selfCount = 0; // How many edges to self
				for (let tar of this.edges[src]) {
					var p = ''; // Path connecting nodes
					if (src == tar) {
						// FIXME pick the best pair of handlers depending on
						// usage and intersections
						selfCount++; // Increase count of self-connections
						var sp = this.handlers[src][1];
						var tp = this.handlers[src][2];
						p = connection_rule_self(sp, tp, selfCount);
						edgePaths.push({data: p});
					} else {
						// Find pair of nearest handlers between source and target
						var nhp = this.nearestHandlers(src, tar);
						// Get source and target points
						var sp = this.handlers[src][nhp[0]];
						var tp = this.handlers[tar][nhp[1]];
						p = connection_rule_magic(sp, tp);
						p = connection_rule_straight(sp, tp);
						edgePaths.push({data: p});
					}
				}
			}
			return edgePaths; // [{data: 'M 20 20 l -20 30'}];
		},
		// A list of connectors from source node to mouse position
		// can be empty or have a single element
		connectors: function() {
			// If linking, create a path between source and mouse
			if (this.connect.sourceNode !== null) {
				var src = this.connect.sourceNode;
				var hid = this.connect.capturedHandler;
				var hand = this.handlers[src][hid];
				var p = 'M ' + hand.x + ' ' + hand.y + ' L ' + this.connect.last.x + ' ' + this.connect.last.y;
				return [{data: p}];
			}
			return [];
		},
	},
	methods: {
		distance: function(p1, p2) {
			var dx = p1.x - p2.x;
			var dy = p1.y - p2.y;
			return dx * dx + dy * dy;
		},
		nearestHandlers: function(src, tar) {
			var sh = this.handlers[src];
			var th = this.handlers[tar];
			var min = [0, 0];
			var minD = this.distance(sh[0], th[0]);
			for (var i = 0; i < sh.length; i++) {
				for (var j = 0; j < th.length; j++) {
					var d = this.distance(sh[i], th[j]);
					if (d < minD) {
						minD = d;
						min = [i, j];
					}
				}
			}
			return min;
		},
		log: function(msg) {
			var last = this.messages.pop();
			if (last && last.startsWith(msg)) {
				this.messages.push(last + '.');
			} else {
				if (last)
					this.messages.push(last);
				this.messages.push(msg);
			}
		},

		// map a point in page coordinates to container svg coordinates
		svgMap: function(pageX, pageY) {
			var offs = $('#app svg').offset(); // $('#app svg').offset();
			return {x: pageX - offs.left, y: pageY - offs.top};
		},
		nextId: function() {
			return Object.keys(this.nodes).length;
		},
		createNode: function(id, x, y, r) {
			r = 30;
			Vue.set(this.nodes, id, {'x': x, 'y': y, 'r': r, 'w': 3*r, 'h': 2*r});
		},
		// Add an edge to the graph
		createEdge: function(src, tar) {
			if (this.edges.hasOwnProperty(src)) {
				this.edges[src].push(tar);
			} else {
				Vue.set(this.edges, src, [tar]);
			}
		},
		// Handle dragging of nodes
		nodePressed: function(nid, ev) {
			// Save captured node
			this.drag.capturedNode = nid;
			// Save click position
			this.drag.page = {x: ev.pageX, y: ev.pageY};
			this.drag.last = this.svgMap(ev.pageX, ev.pageY);
			this.log('Node ' + this.drag.capturedNode + ' pressed @' + this.drag.last.x + ' ' + this.drag.last.y);
		},
		nodeReleased: function(nid, ev) {
			if (this.isConnecting()) {
				this.log('Dropping connection being created');
				this.createEdge(this.connect.sourceNode, nid);
				// This will bubble up and clean the source node
			} else {
				this.log('Release on node ' + nid);
			}
		},

		isDragging: function() {
			return this.drag.capturedNode !== null;
		},
		isConnecting: function() {
			return this.connect.sourceNode !== null;
		},
		// Handle connections
		handlerPressed: function(nid, hid, ev) {
			this.log('Handler pressed ' + nid + ' on handler ' + hid);
			this.connect.sourceNode = nid;
			this.connect.capturedHandler = hid;
			//this.connect.page = {x: ev.pageX, y: ev.pageY};
			this.connect.last = this.svgMap(ev.pageX, ev.pageY);
		},
		handlerReleased: function(nid, hid, ev) {
			if (this.isConnecting()) {
				this.log('Handler released ' + nid + ' on handler ' + hid);
				this.log('Dropping connection being created');
				this.createEdge(this.connect.sourceNode, nid);
				// This event will bubble up and clean the source node
			}
		},

		// Handle movement of nodes or connectors
		globalMouseDown: function(ev) {
			this.log('Mouse pressed globally');
		},
		globalMouseMove: function(ev) {
			if (this.isDragging()) {
				this.log('Dragging a node');
				var nid = this.drag.capturedNode;
				this.nodes[nid].x += ev.pageX - this.drag.page.x;
				this.nodes[nid].y += ev.pageY - this.drag.page.y;
				this.drag.page = {x: ev.pageX, y: ev.pageY};
			} else if (this.isConnecting()) {
				this.log('Connecting nodes');
				this.connect.last = this.svgMap(ev.pageX, ev.pageY);
			} else {
				this.log('Mouse moving globally');
			}
		},
		globalMouseUp: function(ev) {
			if (this.isDragging()) {
				this.log('Dropping object being moved');
				var nid = this.drag.capturedNode;
				this.nodes[nid].x += ev.pageX - this.drag.page.x;
				this.nodes[nid].y += ev.pageY - this.drag.page.y;
				this.drag.page = {x: ev.pageX, y: ev.pageY};
				this.drag.capturedNode = null; // Stop dragging
			} else if (this.isConnecting()) {
				this.log('Dropping while connecting');
				// Check if there is a node under
				this.connect.sourceNode = null;
			} else {
				this.log('Mouse up globally');
				var pos = this.svgMap(ev.pageX, ev.pageY);
				var radius = Math.random() * 35 + 15;
				this.createNode(this.nextId(), pos.x, pos.y, radius);
			}
		},

		localMouseDown: function(id, ev) {
			this.log('Mouse down locally ' + id);
		},
		localMouseMove: function(id, ev) {
			this.log('Mouse moving locally ' + id);
		},
		localMouseUp: function(id, ev) {
			this.log('Mouse up locally ' + id);
		},
	},
});
