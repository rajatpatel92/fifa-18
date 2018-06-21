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
			<div class="column">
				<div class="ui three item menu">
				  <a class="item" @click="activate(1)" :class="{ active : active_el == 1 }">{{ match.homeTeamName }}</a>
				  <a class="item" @click="activate(2)" :class="{ active : active_el == 2 }">{{ match.awayTeamName }}</a>
				  <a class="item" @click="activate(3)" :class="{ active : active_el == 3 }">Draw</a>
				</div>
			</div>
		</div>`,
	methods: {
		activate: function(el){
            this.active_el = el;
        }
	}
}),

Vue.component('today-predictions', {
	props: [],
	template: `<tr>
		<td class="collapsing">
		<i class="clock icon"></i> <b>Vishal</b>
		</td>
		<td class="positive">Portugal, Spain, Draw</td>
	</tr>`
}),

Vue.component('points-table', {
	props: [],
	template: `<tr>
		<td class="collapsing">
		<i class="clock icon"></i> <b>Vishal</b>
		</td>
		<td class="positive">21</td>
	</tr>`
})

var app = new Vue({
	el: '#app',
	data: {
		allData: null,
		todayMatches: null,
		yesterdayResults: null,
		players: null,
		loading: true,
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
		}
	}
});
