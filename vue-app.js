Vue.component('teams-input', {
	props: ['match'],
	data: function () {
		return {
			active_el: 0
		}
	},
	template: `<div class="two column row">
			<div class="middle aligned five wide column">
				<label><b>{{ match.homeTeamName }} vs {{ match.awayTeamName }}</b></label>
			</div>
			<div class="eleven wide column">
				<div class="ui three item menu">
				  <a class="item" @click="activate(1, match)" :class="{ active : active_el == 1 }">{{ match.homeTeamName }}</a>
				  <a class="item" @click="activate(2, match)" :class="{ active : active_el == 2 }">{{ match.awayTeamName }}</a>
				  <!-- <a class="item" @click="activate(3, match)" :class="{ active : active_el == 3 }">Draw</a> -->
				</div>
			</div>
		</div>`,
	methods: {
		activate: function(el, match){
            this.active_el = el;
			var prediction = {
				match: match.homeTeamName + "-" + match.awayTeamName,
				date: match.date
			}
			if (el == 1) {
				prediction.guess = match.homeTeamName;
			} else if (el == 2) {
				prediction.guess = match.awayTeamName;
			} else if (el == 3) {
				prediction.guess = "Draw";
			}
			this.$emit('active_el', prediction);
        }
	}
})

// register the grid component
Vue.component('prediction-grid', {
  template: `<table class="ui celled striped table">
    <thead>
		<tr class="center aligned">
			<th colspan="3">My Today's Predictions*</th>
		</tr>
      <tr class="center aligned">
        <th v-for="key in columns"
          @click="sortBy(key)"
          :class="{ active: sortKey == key }">
          {{ key | capitalize }}
          <span class="arrow" :class="sortOrders[key] > 0 ? 'asc' : 'dsc'">
          </span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="entry in filteredData">
        <td v-for="key in columns">
          {{entry[key]}}
        </td>
      </tr>
    </tbody>
  </table>`,
  props: {
    data: Array,
    columns: Array,
    filterKey: String
  },
  data: function () {
    var sortOrders = {}
    this.columns.forEach(function (key) {
      sortOrders[key] = 1
    })
    return {
      sortKey: '',
      sortOrders: sortOrders
    }
  },
  computed: {
    filteredData: function () {
      var sortKey = this.sortKey
      var filterKey = this.filterKey && this.filterKey.toLowerCase()
      var order = this.sortOrders[sortKey] || 1
      var data = this.data
      if (filterKey) {
        data = data.filter(function (row) {
          return Object.keys(row).some(function (key) {
            return String(row[key]).toLowerCase().indexOf(filterKey) > -1
          })
        })
      }
      if (sortKey) {
        data = data.slice().sort(function (a, b) {
          a = a[sortKey]
          b = b[sortKey]
          return (a === b ? 0 : a > b ? 1 : -1) * order
        })
      }
      return data
    }
  },
  filters: {
    capitalize: function (str) {
      return str.charAt(0).toUpperCase() + str.slice(1)
    }
  },
  methods: {
    sortBy: function (key) {
      this.sortKey = key
      this.sortOrders[key] = this.sortOrders[key] * -1
    }
  }
})

// Initialize Firebase
var config = {
	apiKey: "AIzaSyBLKGQA5OZj52M-G55NeujoF2V9bwqItew",
	authDomain: "ts-fifa18.firebaseapp.com",
	databaseURL: "https://ts-fifa18.firebaseio.com",
	projectId: "ts-fifa18",
	storageBucket: "ts-fifa18.appspot.com",
	messagingSenderId: "186370413467"
};

var firebaseApp = firebase.initializeApp(config)
var db = firebaseApp.database()

var playersRef = db.ref('players')
var predictionsRef = db.ref('predictions')
var datesRef = db.ref('dates')

var app = new Vue({
	el: '#app',
	data: {
		userCode: null,
		allData: null,
		todayMatches: null,
		yesterdayResults: null,
		loading: true,
		predictions: [],
		prediction: {},
		pointsMultiplier: 5,
		message: '',
		showRefresh: false,
		pointsUpdatedOnce: false,
		updatePointsInDB: false,
		savedOnce: false,
		hasError: false,
		noMatchToday: false,
		isDeductionEnabled: true
	},
	firebase: {
		players: playersRef,
		fbpredictions: predictionsRef,
		dates: {
			source: datesRef,
			asObject: true,
			readyCallback: function() {
				this.calculatePoints();
			}
		}
	},
	mounted() {
		axios
			//.get('https://raw.githubusercontent.com/lsv/fifa-worldcup-2018/master/data.json')
			.get('https://api.football-data.org/v1/competitions/467/fixtures', { 
				'headers': { 
					'X-Auth-Token': '211d085dbc04481b9caf911983197a50' 
				} 
			})
			.then(response=>this.buildData(response))
			.catch(error=>(console.log(error)))
	},
	watch: {
		'userCode':  {
			handler:function (val, oldVal){
				if (val.trim()){
					var playerName = _.findWhere(this.players, {userCode:val.trim()});
					if (playerName) {
						this.message = '';
						this.hasError = false;
						var playerTodayPreds = _.filter(this.todayPredictions, function (item) {
							return item.userCode == val.trim()
						});
						if (playerTodayPreds.length != 0){
							app.predictions = [];
							_.each(playerTodayPreds, function(pred) {
								app.predictions.push(pred);
							});
							this.message = "You have already made predictions for today!";
							this.hasError = true;
						}
					} else {
						app.predictions = [];
						this.message = "No player found with entered Code. Please enter correct code."
						this.hasError = true;
					}
				}
			}
		}
	},
	computed: {
		todayDate: function() {
			var today = new Date();
			return today.toISOString().substr(0,10);
		},
		defaultMatchStart: function(){
			var today = new Date();
			return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 15, 0, 0).getTime();
		},
		todayPredictions: function() {
			//Get Today Date
			var today = new Date();
			
			//Build Today's Matches Array
			var listMatches = [];
			_.each(this.todayMatches, function(match) {
				listMatches.push(match.homeTeamName+"-"+match.awayTeamName);
			})
			
			var todayAllpreds = _.filter(this.fbpredictions, function (pred) {
				return pred.date.includes(today.toISOString().substr(0,10)) && _.contains(listMatches, pred.match);
			});
			
			return todayAllpreds;
		},
		myTodayPredictions: function() {
			return _.findWhere(this.todayPredictions, {userCode: this.userCode});
		},
		sortedPlayers: function () {
			return _.sortBy(this.players, 'points').reverse();
		}
	},
	methods: {
		buildData: function(receivedData) {
			//Set Today date
			var today = new Date();
			//Set Yesterday Date
			var yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);

			this.allData = receivedData;
			this.todayMatches = _.filter(this.allData.data.fixtures, function(fixture) {
				return fixture.date.toString().includes(today.toISOString().substr(0, 10));
			});
			if (this.todayMatches.length == 0) {
				this.hasError = true;
				this.message = "No matches scheduled for today!!";
				this.noMatchToday = true;
			}
			this.yesterdayResults = _.filter(this.allData.data.fixtures, function(fixture) {
				return fixture.date.toString().includes(yesterday.toISOString().substr(0, 10));
			});
		},
		getWinningTeam: function(match) {
			if (match.result.goalsHomeTeam > match.result.goalsAwayTeam) {
				return match.homeTeamName;
			} else if (match.result.goalsHomeTeam == match.result.goalsAwayTeam) {
				if (match.result.penaltyShootout) {
					if (match.result.penaltyShootout.goalsHomeTeam > match.result.penaltyShootout.goalsAwayTeam) {
						return match.homeTeamName;
					} else {
						return match.awayTeamName;
					}
				} else {
					return "Draw";	
				}
			} else {
				return match.awayTeamName;
			}
		},
		onTeamSelect: function (prediction) {
			if (this.userCode) {
				var playerName = _.findWhere(this.players, {userCode: this.userCode});
				if (playerName){
					prediction.userCode = this.userCode;
					prediction.playerName = playerName.name;
					_.each(this.predictions, function (item) {
						if (prediction.match == item.match) {
							if (item.userCode) {
								item.userCode = this.userCode;
							}
							item.guess = prediction.guess;
							item.date = prediction.date;
							item.userCode = prediction.userCode;
							return;
						}
					});
					if (this.predictions.length < this.todayMatches.length) {
						if (!_.findWhere(this.predictions, { match: prediction.match })){
							this.predictions.push(prediction);
						}
					}
					//console.log(this.predictions);
				} else {
					this.hasError = true;
					this.message = "No player found with entered Code. Please enter correct code.";
				}
			} else {
				this.message = "Please enter your User Code before saving!!"
			}
		},
		saveIt: function () {
			if (!this.savedOnce) {
				if (!this.userCode) {
					this.hasError = true;
					this.message = "Please enter User Code and Try Again!";
				} else {
					var playerName = _.findWhere(this.players, {userCode: this.userCode});
					var playerTodayPred = _.findWhere(this.todayPredictions, {userCode: this.userCode});
					if (!playerTodayPred) {
						if (playerName){
							_.each(this.predictions, function(prediction) {
								if (!prediction.userCode) {
									this.hasError = true;
									this.message = "Please enter User Code and Try Again!";
								} else if (!prediction.guess) {
									this.hasError = true;
									this.message = "Please make all predictions before saving";
								}
							});
						} else {
							this.hasError = true;
							this.message = "No player found with entered Code. Please enter correct code."
						}
					} else {
						this.hasError = true;
						this.message = "You have already made predictions for today!"
					}
				}

				if ((new Date()).getTime() > this.defaultMatchStart) {
					this.hasError = true;
					this.message = "Submission for today has been closed at 7:15 pm.";
				}

				//Make sure there is no error and player has been identified
				if (!this.hasError && playerName) {
					_.each(this.predictions, function(pred) {
						predictionsRef.push({
							userCode: pred.userCode,
							playerName: playerName.name,
							match: pred.match,
							guess: pred.guess,
							date: pred.date,
							time: (new Date()).getTime()
						})
					});
					this.message = "Saved Successfully..!!";
					this.savedOnce = true;
					this.hasError = true; //Toggle hasError to disable Save button after saved once
				}

			} else {
				this.message = "You cannot make choices twice a day buddy..!!";
				this.hasError = true;
			}
		},
		updatePlayers: function (item) { 
			// create a copy of the item
			const copy = {...item}
			// remove the .key attribute
			delete copy['.key']
			playersRef.child(item['.key']).set(copy)
		}, 
		updateDates: function (item) {
			// create a copy of the item
			const copy = {...item}
			// remove the .key attribute
			delete copy['.key']
			datesRef.child(item['.key']).set(copy)
		},
		calculatePoints: function () {
			var lastRefreshDate = this.dates.lastPointsCalc;
			console.log("Last Points Calculation Date : " + lastRefreshDate);
			//if (!this.pointsUpdatedOnce) {
				//Check in DB for last Update Date
				if (lastRefreshDate !== this.todayDate) { 
					this.updatePointsInDB = true; 
				} else {
					this.updatePointsInDB = false;
				}
				//Go through yesterday's predictions and calculate points
				var yesterdayWinners = [];
				var players = this.players;
				_.each(this.yesterdayResults, function (yesterdayMatch) {
					var winner = {
						winner: app.getWinningTeam(yesterdayMatch),
						match: yesterdayMatch.homeTeamName +"-"+ yesterdayMatch.awayTeamName
					}
					yesterdayWinners.push(winner);
					winner = {};
				});
				
				//Set Yesterday Date
				var yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
								
				var yesterdayPredictions = _.filter(this.fbpredictions, function (prediction){ return prediction.date.includes(yesterday.toISOString().substr(0,10)) });

				_.each(yesterdayWinners, function (winner) {
					//Filter current match
					var matchPreds = _.filter(yesterdayPredictions, function (pred) { return pred.match === winner.match });
					//console.log(matchPreds);
					//Count points to be credited to winner
					var counts = _.countBy(matchPreds, function (pred){ return pred.guess == winner.winner ? 'winningPlayers' : 'losingPlayers' });
					//console.log(counts);
					var winningPlayers = _.pluck(_.filter(matchPreds, function(pred) { return pred.guess == winner.winner }), 'userCode' );
					//console.log(winningPlayers);
					var pointsToWinner = (app.players.length - winningPlayers.length) * app.pointsMultiplier;
					//Push winning players to yesterdayResults object
					app.pushWinningPlayers(winningPlayers, winner.match, pointsToWinner); //counts['losingPlayers']
					if (app.updatePointsInDB == true) {
						//Add points to winner account
						//console.log("Before points addition");
						//console.log(players);
						_.each(winningPlayers, function (winningPlayer) {
							var player = _.findWhere(players, { userCode: winningPlayer});
							if (player && pointsToWinner) {
								player.points += pointsToWinner;
							}
						});
						//Reduce points of losing players in special matches
						if (app.isDeductionEnabled == true) {
							var pointsToDeduct = winningPlayers.length * app.pointsMultiplier;
							_.each(players, function (player) {
								//Detect and deduct points if player is losing player
								if (!_.contains(winningPlayers, player.userCode)) {
									player.points -= pointsToDeduct;
								}
							});
						}
						//console.log("After points addition")
						//console.log(players);
					}
				});

				if (this.updatePointsInDB == true) {
					if (app.dates.lastPointsCalc !== app.todayDate && app.todayDate.length === 10) {
						_.each(this.players, function (player) {
							app.updatePlayers(player);
						});

						datesRef.update({
							lastPointsCalc: app.todayDate
						}).then(response=>console.log(response))
						.catch(error=>console.log(error))
					}
				}
		},
		pushWinningPlayers: function (winningPlayers, match, pointsToWinner) {
			//Get Players' first names from user codes
			var playerNames = [];
			if (winningPlayers.length == 0){
				playerNames.push("None");
			} else {
				_.each(winningPlayers, function(code) {
					var playerName = _.findWhere(app.players, {userCode: code});
					if (playerName){
						var firstName = playerName.name.split(" ")[0];
						playerNames.push(" " + firstName); //add space after player name for better looking
					}
				});
			}
			//Push winner names to respective match result record
			var teams = match.split("-");
			if (teams.length == 2) {
				var yesterdayMatchIndex = _.findIndex(app.yesterdayResults, { homeTeamName: teams[0], awayTeamName: teams[1] });
				if (yesterdayMatchIndex !== -1) {
					//Add winningPlayers property to the object and make it reactive to display changes on the web page
					var newObject = _.extend({}, app.yesterdayResults[yesterdayMatchIndex], { winningPlayers: playerNames.toString(), pointsToWinner: pointsToWinner });
					app.$set(app.yesterdayResults, yesterdayMatchIndex, newObject);
				}
			}
		}
	}
});
