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
				  <a class="item" @click="activate(3, match)" :class="{ active : active_el == 3 }">Draw</a>
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

// first argument is the source array, followed by one or more property names
var pluckMany = function() {
    // get the property names to pluck
    var source = arguments[0];
    var propertiesToPluck = _.rest(arguments, 1);
    return _.map(source, function(item) {
        var obj = {};
        _.each(propertiesToPluck, function(property) {
            obj[property] = item[property]; 
        });
        return obj;
    });
};

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
		message: ''
	},
	firebase: {
		players: playersRef,
		fbpredictions: predictionsRef
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
					this.message = '';
				}
			}
		}
	},
	computed: {
		todayDate: function() {
			var today = new Date();
			var thisMonth = parseInt(today.getMonth());
			return today.getFullYear() +"-0"+ parseInt(thisMonth+1) + "-" + today.getDate();
		},
		todayPredictions: function() {
			//Get Today Date
			var today = new Date();
			var thisMonth = parseInt(today.getMonth());
			var todayDate = today.getFullYear() +"-0"+ parseInt(thisMonth+1) + "-" + today.getDate();
			
			//Build Today's Matches Array
			var listMatches = [];
			_.each(this.todayMatches, function(match) {
				listMatches.push(match.homeTeamName+"-"+match.awayTeamName);
			})
			
			var todayAllpreds = _.filter(this.fbpredictions, function (pred) {
				return pred.date.includes(todayDate) && _.contains(listMatches, pred.match);
			});
			
			return todayAllpreds;
		}
	},
	methods: {
		buildData: function(receivedData) {
			var today = new Date();
			var thisMonth = parseInt(today.getMonth());
			this.allData = receivedData;
			this.todayMatches = _.filter(this.allData.data.fixtures, function(fixture) {
				return fixture.date.toString().includes(today.getFullYear() +'-0'+ parseInt(thisMonth+1) +'-'+ today.getDate());
			});
			this.yesterdayResults = _.filter(this.allData.data.fixtures, function(fixture) {
				if (today.getDate === 1) {
					return fixture.date.toString().includes(today.getFullYear() +'-'+ today.getMonth() +'-'+ '30');
				} else {
					return fixture.date.toString().includes(today.getFullYear() +'-0'+ parseInt(thisMonth+1) +'-'+ parseInt(today.getDate()-1));
				}
			});
		},
		getWinningTeam: function(match) {
			if (match.result.goalsHomeTeam > match.result.goalsAwayTeam) {
				return match.homeTeamName;
			} else if (match.result.goalsHomeTeam == match.result.goalsAwayTeam) {
				return "Draw";
			} else {
				return match.awayTeamName;
			}
		},
		onTeamSelect: function (prediction) {
			if (this.userCode) {
				prediction.userCode = this.userCode;
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
				if (this.predictions.length < 3) {
					this.predictions.push(prediction);
				}
				console.log(this.predictions);
			} else {
				this.message = "Please enter your User Code!!"
			}
		},
		writePredictionData: function (userid, predictions) {
			var pred = {
				id: userid,
				predictions: predictions
			}
		},
		saveIt: function () {
			if (!this.userCode) {
				this.message = "Please enter User Code and Try Again!";
			} else {
				_.each(this.predictions, function(prediction) {
					if (!prediction.userCode) {
						this.message = "Please enter User Code and Try Again!";
					} else if (!prediction.guess) {
						this.message = "Please make all predictions before saving";
					}
				});
			}
			_.each(this.predictions, function(pred) {
				predictionsRef.push({
					userCode: pred.userCode,
					match: pred.match,
					guess: pred.guess,
					date: pred.date
				})
			});
			this.message = "Saved Successfully..!!";
		},
		calculatePoints: function (allpreds) {
			//Go through yesterday's predictions and calculate points
			var yesterdayWinners = [];
			_.each(this.yesterdayResults, function (yesterdayMatch) {
				var winner = {
					winner: app.getWinningTeam(yesterdayMatch),
					match: yesterdayMatch.homeTeamName +"-"+ yesterdayMatch.awayTeamName
				}
				yesterdayWinners.push(winner);
				winner = {};
			});
			
			var today = new Date();
			var thisMonth = parseInt(today.getMonth());
			var todayDate = today.getFullYear() +"-0"+ parseInt(thisMonth+1) + "-" + today.getDate();
			
			var yesterdayDate = null;
			if (this.todayDate === 1) {
				yesterdayDate = today.getFullYear() +'-'+ today.getMonth() +'-'+ '30';
			} else {
				yesterdayDate = today.getFullYear() +'-0'+ parseInt(thisMonth+1) +'-'+ parseInt(today.getDate()-1);
			}
			var yesterdayPredictions = _.filter(this.fbpredictions, function (prediction){ return prediction.date.includes(yesterdayDate) });
			
			console.log(yesterdayPredictions);
			console.log(yesterdayWinners);
		}
	}
});
