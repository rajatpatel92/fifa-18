Vue.component('teams-input', {
	props: ['match'],
	template: `<div class="three column row">
			<div class="middle aligned column">
				<label><b>{{ match.homeTeamName }} vs {{ match.awayTeamName }}</b></label>
			</div>
			<div class="two column">
				<div class="ui selection dropdown">
				  <input type="hidden" name="prediction">
				  <i class="dropdown icon"></i>
				  <div class="default text">Prediction</div>
				  <div class="menu">
					<div class="item" :data-value=match.homeTeamName>{{ match.homeTeamName }}</div>
					<div class="item" :data-value=match.awayTeamName>{{ match.awayTeamName }}</div>
					<div class="item" data-value="Draw">Draw</div>
				  </div>
				</div>
			</div>
		</div>`
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
		players: null
	},
	mounted (){
		axios
			//.get('https://raw.githubusercontent.com/lsv/fifa-worldcup-2018/master/data.json')
			.get('https://api.football-data.org/v1/competitions/467/fixtures', { 
				'headers': { 
					'X-Auth-Token': '211d085dbc04481b9caf911983197a50' 
				} 
			}).then(response=>(this.buildData(response)))
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
})
