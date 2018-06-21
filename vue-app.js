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

var app = new Vue({
	el: '#app',
	data: {
		userCode: null,
		allData: null,
		todayMatches: null,
		yesterdayResults: null,
		players: null,
		loading: true,
		predictions: [],
		prediction: {},
		message: ''
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
			console.log(this.predictions);
		}
	}
});
