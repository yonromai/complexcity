#!/usr/bin/python -tt
# -*- coding: utf-8 -*-
import networkx as nx
from networkx.readwrite import json_graph
import math
import LatLongUTMconversion as conv
import scipy.cluster.vq as scipy
import numpy
import json

#-----------------------------------
# Project: Complexcity (http://complexcity.herokuapp.com/)
# Author: Romain Yon (romain.yon@gmail.com)
#-----------------------------------
# Abstract: Script to aggregate shanghai graphs from every different sources (Roads, buses & subways).
#-----------------------------------
# Usage: python aggregator.py
#
# Install needed packages:
# - networkx (OSX: sudo easy_install networkx)
# - numpy (OSX: http://sourceforge.net/projects/numpy/files/NumPy/1.6.2/)
# - scipy (OSX: http://sourceforge.net/projects/scipy/files/scipy/0.10.1/
#-----------------------------------

#-----------------------------------
# Config 
#-----------------------------------
# FIXME: Move to config and make the system more flexible (keeping other attributes would be painful in the current implementation)
nodeAttributesToKeep = ['latitude','longitude']
edgeAttributesToKeep = ['type']
outFileName = 'shanghaiNetwork{0}.{1}'
outputOnlyReducedGraphs = True
# 1 - Road crosses
roadPath = 'source/shanghaiRoads.gexf'
# 2 - Bus lines
busPath = 'source/ShanghaiBus.gexf'
# 3 - Subways
subwayPath = 'source/subway.gexf'
# 4 - Hospitals
hospitalsPath = 'source/Hospitals.gexf'

#-----------------------------------
# (Pre)Processing the different graphscle
#-----------------------------------
def process_roads(roadPath):
	print 'Processing Roads...'
	G = nx.read_gexf(roadPath)
	return check_and_format_graph(G, 'road', roadPath)

def process_bus(busPath):
	print 'Processing Bus lines...'
	G = nx.read_gexf(busPath, node_type = unicode)
	return check_and_format_graph(G, 'bus', busPath)

def process_subways(subwayPath):
	print 'Processing Subways...'
	G = nx.read_gexf(subwayPath)
	return check_and_format_graph(G, 'subway', busPath)

def process_hospitals(hospitalsPath):
	print 'Processing Hospitals...'
	G = nx.read_gexf(hospitalsPath)
	return check_and_format_graph(G, 'hospital', hospitalsPath)

def check_and_format_graph(G, type, fPath):
	removedNodes = []
	for node1 in G:
		try : 
			check_mandatory_attr(G, node1, fPath)
		except KeyError:
			removedNodes.append(node1)
		for node2 in G[node1]:
			G[node1][node2]['type'] = type # relabeling edges
	for node in removedNodes:
		G.remove_node(node)
	print '> Finished : {0} nodes & {1} edges found'.format(
		G.number_of_nodes(), 
		G.number_of_edges())
	if removedNodes:
		print 'WARNING: {2} noncompliant nodes removed'.format(len(removedNodes))
	return G

def check_mandatory_attr(G, node, file):
	mandatoryAttr = nodeAttributesToKeep
	for attr in mandatoryAttr:
		try:
			x = G.node[node][attr]
		except KeyError:
			print "ERROR : Graph '{0}' - Node '{1}'' does no contain mandatory attribute '{2}'".format(file, node.encode('utf-8'), attr)
			raise

#-----------------------------------
# Merging graphs
#-----------------------------------

# Merging and pre-reducing
def merge_graphs(*graphs):#FIXME: Optimize traversal (multiple times)
	print 'Merging Graphs...'
	MG=nx.MultiGraph()
	count = 0
	for G in graphs:
		count += 1
		if hasattr(G,'to_undirected'): # Make directed graph undirected... #FIXME: Deal with directed graphs
			print "> Graph {0} : Converting to undirected Graph".format(count)
			G = G.to_undirected()
		# Clean and add nodes
		print "> Graph {0} : Cleaning and Merging Nodes".format(count)
		for node in G.nodes():
			MG.add_node(node)
			attributes = G.node[node].keys()
			for attr in attributes:
				if attr not in nodeAttributesToKeep:
					del G.node[node][attr] #Filtering unwanted node attributes
					continue
				MG.node[node][attr] = G.node[node][attr]
			MG.node[node]['type'] = 'node'
		# Clean and add edges
		print "> Graph {0} : Cleaning and Merging Edges".format(count)
		for (node1,node2,data) in G.edges(data = True):
			MG.add_edge(node1,node2)
			edgeCount = max(MG.edge[node1][node2])
			attributes = G.edge[node1][node2].keys()
			for attr in attributes:
				if attr not in edgeAttributesToKeep:
					del G.edge[node1][node2][attr]
					continue
				MG.edge[node1][node2][edgeCount][attr] = G.edge[node1][node2][attr]
			MG.edge[node1][node2][edgeCount]['weight'] = distance(G.node[node1],G.node[node2])
	s = '> Finished : {0} nodes & {1} edges found'.format(
		MG.number_of_nodes(),
		MG.number_of_edges())
	if not outputOnlyReducedGraphs:
		fName = outFileName.format("","gexf")
		nx.write_gexf(MG,fName)
		s +=  ' (saved in {0})'.format(fName)
	print s
	return MG

#-----------------------------------
# Reducting graphs
#-----------------------------------

def reduce_graph(G,clusters,retries):
	H = process_hospitals(hospitalsPath)
	if not outputOnlyReducedGraphs:
		export_as_coord_list(H,"hospitals.json") 
	print 'Processing K-means graph reduction...'
	floatPrec = 2
	print '> Preprocessing Node Reduction: Restricting Lat/long floating precision to {0} decimals'.format(floatPrec)
	G = reduce_latlong_precision(G,floatPrec)
	print '>> Finished : {0} nodes & {1} edges found'.format(
		G.number_of_nodes(), 
		G.number_of_edges())
	print '> Preprocessing Graph: Converting Lat/Long to Universal Transverse Mercator'
	points = []
	zone = []
	for node in G.nodes(): 
		(z, x, y) = conv.LLtoUTM(
			23,# 23 arg => WGS84
			float(G.node[node]['latitude']),
			float(G.node[node]['longitude']))
		zone.append(z)
		points.append([x,y])
	for i in range(min(len(clusters), len(retries))):
		clusterCount = clusters[i]
		retryCount = retries[i]
		print '> Computing Reduced Graph-{0} : Reducing G to {1} nodes ({2} iterations)'.format(clusterCount, clusterCount, retryCount)
		centroids, dist = scipy.kmeans(numpy.array(points), clusterCount, iter = retryCount)
		print '> Computing Reduced Graph-{0} : Affecting each point to a centroid'.format(clusterCount)
		centroids, idx = scipy.kmeans2(numpy.array(points), centroids, minit = 'matrix')
		MG = extract_reduced_graph(G, centroids, idx, zone)
		print '> Computing Reduced Graph-{0} : Filtering Edges'.format(clusterCount)
		lastWeight = sum_edge_weight(MG)
		MG = keep_min_edges(MG)
		print '>> Finished: total edge weight reduced from {0} to {1}'.format(
			round(lastWeight,2), 
			round(sum_edge_weight(MG),2))
		print '> Adding Hospitals to Graph-{0}'.format(clusterCount)
		MG = add_hospitals(H,MG)
		write_json(MG, clusterCount)
		print '> Reduced Graph-{0} Completed : {1} nodes & {2} edges found'.format(
			clusterCount,
			MG.number_of_nodes(),
			MG.number_of_edges())

# This function will output n reduced graphs (that have an increasing number of nodes) from G
def automatic_graph_reduce(G,n,minClusters):
	totalNodes = G.number_of_nodes()
	clusters = []
	retries = []
	for i in range(n):
		clusters.append(get_log_node_count(i,n,minClusters,totalNodes))
		retries.append(get_retry_count(i,n))
	reduce_graph(G,clusters,retries)

def track_outliers(G):
	print 'Tracking outliers...'
	points = []
	for node in G.nodes():
		lat = float(G.node[node]['latitude'])
		long = float(G.node[node]['longitude'])
		if lat < 30.5 or lat > 32 or long > 122.1 or long < 120.9:
			G.remove_node(node)
			points.append('[{0},{1}]'.format(lat,long))
	s = '> Finished: {0} outliers found'.format(len(points))
	if len(points) > 0 and not outputOnlyReducedGraphs:
		fName = "outlayers.json"
		f = open(fName, 'w')
		sf = '[{0}]'.format(",".join(points))
		f.write(sf)
		f.close
		s +=  ' (Moved to {0})'.format(fName)
	print s
	return G

# For each hospital in H, find in G the more proximate point and attach an hospital to it
def add_hospitals(H,G):
	hospitals = []
	for hosp in H.nodes(): # FIXME: improve Crappy O(n^2) complexity
		minDist = None
		minNode = None
		for node in G.nodes():
			currDist = distance(G.node[node],H.node[hosp])
			if not minDist or currDist < minDist:
				minDist = currDist
				minNode = node
		if(minNode):
			G.node[minNode]['type'] = 'hospital'
			hospitals.append(minNode)
	print '>> Finished : {0} hospitals added to the graph'.format(len(set(hospitals)))
	return G


#-----------------------------------
# Util functions
#-----------------------------------

# Calculate distance between points see [Formula and code for calculating distance based on two lat/lon locations](http://jan.ucc.nau.edu/~cvm/latlon_formula.html)
def distance(node1, node2):
	r = 6378000 # default earth radius
	deg2rad = math.pi / 180.0
	a1 = float(node1['latitude']) * deg2rad
	b1 = float(node1['longitude']) * deg2rad
	a2 = float(node2['latitude']) * deg2rad
	b2 = float(node2['longitude']) * deg2rad
	c = math.cos(a1) * math.cos(b1) * math.cos(a2) * math.cos(b2)
	d = math.cos(a1) * math.sin(b1) * math.cos(a2) * math.sin(b2)
	e = math.sin(a1) * math.sin(a2)
	return math.acos(c + d + e) * r

def get_log_node_count(i, n, mini, total):
	l = math.log(mini)
	L = (math.log(total) - l) / float(n)
	return long(round(math.exp(l+i*L),0))

def get_retry_count(i,n):
	return long(math.pow((n-i),2))

def extract_reduced_graph(G, centroids, idx, zone):
	mapping = {}
	count = 0
	for node in G.nodes():
		mapping[node] = str(idx[count])
		count += 1
	MG = nx.relabel_nodes(G, mapping, copy = True)
	for i in range(len(centroids)):
		(x, y) = centroids[i]
		(lat, long) = conv.UTMtoLL(23,y,x,zone[i])
		MG.node[str(i)]['latitude'] = lat
		MG.node[str(i)]['longitude'] = long
	return MG

def write_json(G, i):
	data = json_graph.adjacency_data(G)
	s = json.dumps(data)
	f = open(outFileName.format('-{0}'.format(i),"json"), 'w')
	f.write(s)
	f.close()
	if not outputOnlyReducedGraphs:
		export_as_coord_list(G, 'nodes-{0}.json'.format(i)) 

def export_as_coord_list(G, fName):
	points = []
	for node in G.nodes():
		lat = float(G.node[node]['latitude'])
		long = float(G.node[node]['longitude'])
		points.append('[{0},{1}]'.format(lat,long))
	f = open(fName, 'w')
	s = '[{0}]'.format(",".join(points))
	f.write(s)
	f.close

def keep_min_edges(G):
	minEdges = {}
	for (node1,node2,key,data) in G.edges(data=True, keys=True):
		if node1 not in minEdges:
			minEdges[node1] = {}
		if node2 not in minEdges[node1]:
			minEdges[node1][node2] = {}
		type = data['type']	
		if type not in minEdges[node1][node2] or minEdges[node1][node2][type] > data['weight']:
			minEdges[node1][node2][type] = data['weight']
		G.remove_edge(node1, node2, key = key)
	for node1 in minEdges:
		for node2 in minEdges[node1]:
			for type in minEdges[node1][node2]:
				G.add_edge(node1,node2, weight = minEdges[node1][node2][type], type = type)
	return G


def add_reduced_node(G, node, floatPrec):
	rlat = round(float(node['latitude']), floatPrec)
	rlong = round(float(node['longitude']), floatPrec)
	key = '{0};{1}'.format(rlat,rlong)
	G.add_node( key, longitude = rlong, latitude = rlat, type = node['type'])
	return key


def reduce_latlong_precision(G,floatPrec):
	MG = nx.MultiGraph()
	for (node1,node2,data) in G.edges(data = True):
		rnode1 = add_reduced_node(MG,G.node[node1],floatPrec)
		rnode2 = add_reduced_node(MG,G.node[node2],floatPrec)
		MG.add_edge(rnode1, rnode2, type = data['type'], weight = data['weight'])
	return MG


def sum_edge_weight(G):
	count = 0
	for (n1,ns,data) in G.edges(data=True):
		count += data['weight']
	return	count


#-----------------------------------
# Main function
#-----------------------------------

def main():
	G1 = process_roads(roadPath)
	G2 = process_bus(busPath)
	G3 = process_subways(subwayPath)
	G = merge_graphs(G1,G2,G3)
	G = track_outliers(G)
	reduce_graph(G,
		(150,500,1000,1500,2000,2500),
		(10,7,5,4,3,2))
	return


# Standard boilerplate to call the main() function.
if __name__ == '__main__':
  main()