package org.strangeforest.tcb.dataload

import java.sql.Connection
import com.xlson.groovycsv.CsvParser
import org.junit.jupiter.api.Test

class MatchLoaderTest {

	@Test void 'imports Paris Olympic match with explicit or legacy tournament level'() {
		getClass().getResourceAsStream('/paris-olympics-2024.csv').withReader('UTF-8') { reader ->
			def record = CsvParser.parseCsv([:], reader).next().toMap()
			def connection = [createArrayOf: { String type, Object values -> null }] as Connection
			for (level in ['O', 'A']) {
				def params = new MatchLoader(null).params(record + [tourney_level: level], connection)
				assert params.tournament_level == 'O'
				assert params.ext_tournament_id == 'O'
				assert params.tournament_name == 'Olympics'
				assert params.event_name == 'Paris Olympics'
				assert params.season == 2024
				assert params.surface == 'C'
				assert params.match_num == 101
				assert params.ext_winner_id == 104925
				assert params.ext_loser_id == 105051
				assert params.score == '6-0 6-1'
				assert params.loser_entry == 'AL'
			}
		}
	}
}
