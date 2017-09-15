var map;
//foursquare API credentials
var foursquare = {
    clientID: "WE1D35INB2ACUIRY50FA2MUNNK4HPBCO1SJMMAEEOGH3TF4H",
    clientSecret: "BA300JQXEQC3RSX42SVM1ODXLR2HMALNVROSJ24OJBMVMKQ2"
};

//marker icons for default and clicked state
var markerIcons = {
    default: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=M|000cff",
    clicked: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=M|f6ff00"
};

//this variable to put the current clicked place to help me hide the infowindow
var currentPlace = null;

var ViewModel = function() {
	var thisViewModel = this;

	thisViewModel.wikiWord = ko.observable("Egypt");//search on wikipedia on this word
	thisViewModel.Wikis = ko.observableArray([]);//wiki pages

	thisViewModel.allPlaces = ko.observableArray([]);//allplaces not filtered
	thisViewModel.filteredPlaces = ko.observableArray([]);//filtered places

	thisViewModel.currentPositionLoaded = ko.observable(false);//true if current position loaded
	thisViewModel.currentPosition = ko.observable({//current position location
		lat: 38.8972909, 
		lng: -77.0387004
	});

	thisViewModel.searchInput = ko.observable("");//search input field

	//load the map
	map = new google.maps.Map(document.getElementById('map'), {
		center: thisViewModel.currentPosition(),
		zoom: 13
	});

	//check geolocation to get the current location and set map center to this location then get places for it
	thisViewModel.getCurrentPosition = ko.computed(function(){

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function(position) {
				var pos = {
					lat: position.coords.latitude,
					lng: position.coords.longitude
				};
				thisViewModel.currentPosition(pos);//set current position location
				map.setCenter(pos);
				thisViewModel.currentPositionLoaded(true);//set current position loaded to true
			}, function() {
				alert("Error while getting your current location!");
			});
		} else {
			// Browser doesn't support Geolocation
			alert("your browser doesn't support Geolocation!");
		}

		//if it took more than 3 seconds to detect current location load the default
		setTimeout(function(){
			if(!thisViewModel.currentPositionLoaded()){
				thisViewModel.currentPositionLoaded(true);
			}
		},3000);
	}, thisViewModel);
	
	//load all places from foursquare API related to my current location
	thisViewModel.getAllPlaces = ko.computed(function(){
		if(thisViewModel.currentPositionLoaded()){
			var placesAjaxURL = 'https://api.foursquare.com/v2/venues/search?ll='+ 
									thisViewModel.currentPosition().lat + ',' + thisViewModel.currentPosition().lng + 
									'&client_id=' + foursquare.clientID + 
									'&client_secret=' + foursquare.clientSecret + 
									'&limit=18&v=20170914';
			$.getJSON(placesAjaxURL).done(function(data) {
		        var results = data.response.venues;
		        var placesCache = [];
		        results.forEach(function(PlaceDetails,key){
		        	placesCache.push(new Place(PlaceDetails,thisViewModel));
		        	if(key === 0){//save wiki search word to current location
		        		if(PlaceDetails.location.formattedAddress[1] !== undefined){
							thisViewModel.wikiWord(PlaceDetails.location.formattedAddress[1]);
		        		}else if(PlaceDetails.location.formattedAddress[0] !== undefined){
		        			thisViewModel.wikiWord(PlaceDetails.location.formattedAddress[0]);
		        		}
		        	}
		        });
		        thisViewModel.allPlaces(placesCache);//set allplaces to all places came from API
		        return true;
		    }).fail(function() {
		        alert("an error while getting places.");
		    });
		}
	}, thisViewModel);

	//filter by search input the places results
	thisViewModel.filteredPlaces = ko.computed(function(){
        var filter_q = thisViewModel.searchInput().toLowerCase();
        
        if(!filter_q){
            //show all places
            thisViewModel.allPlaces().forEach(function(oneplace){
                oneplace.Visible(true);
            });

            return thisViewModel.allPlaces();
        }else{
            //filter places with this keyword
            return ko.utils.arrayFilter(thisViewModel.allPlaces(), function(onePlace) {
                var place_name = onePlace.Name.toLowerCase();
                var result = (place_name.search(filter_q) >= 0);
                onePlace.Visible(result);
                return result;
            });
        }
    }, thisViewModel);

	//to get the count for filtered places
    thisViewModel.filteredCount = ko.computed(function(){
    	return thisViewModel.filteredPlaces().length;
    }, thisViewModel);

    //to get the count for all places
    thisViewModel.allCount = ko.computed(function(){
    	return thisViewModel.allPlaces().length;
    }, thisViewModel);

    //get Wikis from wikipedia API
    thisViewModel.getTips = ko.computed(function() {
    	if(thisViewModel.wikiWord() !== "" && thisViewModel.wikiWord() !== undefined){
    		$.ajax({
	            type: "GET",
	            url: "http://en.wikipedia.org/w/api.php?action=opensearch&format=json&prop=text&search="+thisViewModel.wikiWord()+"&callback=?",
	            contentType: "application/json; charset=utf-8",
	            async: true,
	            dataType: "jsonp",
	            success: function (data) {
	                for (var i=0;i<data[1].length;i++){
	                    thisViewModel.Wikis.push({Title: data[1][i], Url: data[3][i]});
	                }
	            },
	            error: function (errorMessage) {
	                alert("Error: can't load wikipedia Links.");
	                console.log(errorMessage);
	            }
	        });
    	}
	        
    }, thisViewModel);

};

var Place = function(placeData, ViewModel){
	var thisPlace = this;

	thisPlace.Name 		 = placeData.name;
	if(placeData.Categories !== undefined){
		thisPlace.Category 	 = placeData.Categories[0].name;
	}else{
		thisPlace.Category = "";
	}
	
	thisPlace.Address 	 = placeData.location.address;
	thisPlace.City 		 = placeData.location.city;
	thisPlace.State 	 = placeData.location.state;
	thisPlace.Country 	 = placeData.location.country;
	thisPlace.Distance 	 = placeData.location.distance;
	thisPlace.postalCode = placeData.location.postalCode;
	thisPlace.Lat 		 = placeData.location.lat;
	thisPlace.Lng 		 = placeData.location.lng;

	//function to validate the data put in infowindow
	thisPlace.getValue = function(item){
		if(item === undefined){
			item = "";
		}
		return item;
	};

	//prepare infowindow HTML
	thisPlace.infoBoxContent = ko.computed(function () {
        return '<div class="info-window-content">'+
            '<div class="title"><b>' + thisPlace.getValue(thisPlace.Name) + "</b></div>" +
            '<div class="content">' + thisPlace.getValue(thisPlace.Address) + "</div>" +
            '<div class="content">' + thisPlace.getValue(thisPlace.City) + "</div>" +
            '<div class="content">' + thisPlace.getValue(thisPlace.State) + "</div>" +
            '<div class="content">' + thisPlace.getValue(thisPlace.Category) + "</div>" +
            '<div class="content">Distance from you: ' + thisPlace.getValue(thisPlace.Distance) + "</div>" +
            "</div>";
    }, thisPlace);

	thisPlace.Visible = ko.observable(true);//set default place visibilty to true
	
	//create the marker with the default marker icon
	thisPlace.Marker = new google.maps.Marker({
		position: new google.maps.LatLng(thisPlace.Lat, thisPlace.Lng),
		map: map,
		title: thisPlace.Name,
		icon: markerIcons.default
	});

	//function to show/hide marker based on visible attribute
	thisPlace.showHideMarker = ko.computed(function() {
        if( thisPlace.Visible() ) {
            thisPlace.Marker.setMap(map);
        } else {
            thisPlace.Marker.setMap(null);
        }
        return true;
    }, thisPlace);

	//create empty infowindow
    thisPlace.infoWindow = new google.maps.InfoWindow({content: ""});

    //on marker click event
    thisPlace.Marker.addListener('click', function(){
    	//hide current place infowindow
    	if(currentPlace){
    		currentPlace.infoWindow.setMap(null);
    		currentPlace.Marker.setIcon(markerIcons.default);
    	}

    	//set current place with this place
    	currentPlace = thisPlace;
    	thisPlace.Marker.setIcon(markerIcons.clicked);
    	thisPlace.infoWindow.setContent(thisPlace.infoBoxContent());
        thisPlace.infoWindow.open(map, thisPlace.Marker);

        thisPlace.Marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {//to stop bouncing after 2 seconds
            thisPlace.Marker.setAnimation(null);
        }, 2000);
    });

    //this will be trigered on click on the place from page
    thisPlace.viewPlace = function(onePlace){
		google.maps.event.trigger(onePlace.Marker, 'click');
	};

};

function initMap(){
	ko.applyBindings(new ViewModel());
}

function mapError(){
	alert("Error while loading Map, please try refreshing the page!");
}