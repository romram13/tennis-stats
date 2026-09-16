package org.strangeforest.tcb.dataload

import java.sql.Connection
import java.nio.file.Path
import org.junit.jupiter.api.*
import org.junit.jupiter.api.io.TempDir
import org.strangeforest.tcb.util.Country

class CSVSourceTest {

	@TempDir public Path directory

	@Test void 'reads current player headers and preserves first data row'() {
		def loader = new CapturingLoader(new PlayerLoader(null).columnNames())
		def file = csv('players.csv', 'player_id,name_first,name_last,hand,dob,ioc,height,wikidata_id\n100001,Gardnar,Mulloy,R,19131122,USA,185,Q54544\n')
		assert loader.loadFile(file.path, true) == 1
		assert new PlayerLoader(null).params(loader.records[0], null).first_name == 'Gardnar'
		assert new StagingPlayerLoader(null).params(loader.records[0], null).country == 'USA'
	}

	@Test void 'reads ranking headers by name even when reordered'() {
		def loader = new CapturingLoader(new RankingLoader(null).columnNames())
		def file = csv('rankings.csv', 'ranking_date,player,rank,points\n20260105,207989,1,12050\n')
		assert loader.loadFile(file.path, true) == 1
		assert new RankingLoader(null).params(loader.records[0], null)[1..3] == [207989, 1, 12050]
	}

	@Test void 'does not drop first row of historical headerless files'() {
		def loader = new CapturingLoader(new RankingLoader(null).columnNames())
		assert loader.loadFile(csv('rankings.csv', '20260105,1,207989,12050\n').path) == 1
		assert loader.records[0].player_id == '207989'
	}

	@Test void 'rejects incomplete headers before loading'() {
		def loader = new CapturingLoader(new PlayerLoader(null).columnNames())
		Assertions.assertThrows(IllegalArgumentException) {
			loader.loadFile(csv('players.csv', 'player_id,name_first\n1,Test\n').path)
		}
		assert loader.records.empty
	}

	@Test void 'unsupported country codes do not abort player imports'() {
		assert BaseCSVLoader.country('?', '???') == '???'
		assert BaseCSVLoader.country('USA', '???') == 'USA'
		assert BaseCSVLoader.country('BIR', '???') == 'BIR'
		assert BaseCSVLoader.country('LEB', '???') == 'LEB'
	}

	@Test void 'preserves historical East Germany country in player imports'() {
		def loader = new CapturingLoader(new PlayerLoader(null).columnNames())
		def file = csv('players.csv', 'player_id,name_first,name_last,hand,dob,ioc\n1,Test,Player,R,19600101,GDR\n')
		assert loader.loadFile(file.path) == 1
		def params = new PlayerLoader(null).params(loader.records[0], null)
		assert params.country_id == 'GDR'
		def country = new Country(params.country_id)
		assert country.id == 'GDR'
		assert country.name == 'East Germany'
		assert country.code == 'de'
	}

	@Test void 'discovers singles seasons and replays last two in delta mode'() {
		['atp_matches_1968.csv', 'atp_matches_2025.csv', 'atp_matches_2026.csv',
		 'atp_matches_qual_chall_2026.csv', 'atp_matches_futures_2026.csv'].each { csv(it, '') }
		def previousDir = System.getProperty(LoadParams.BASE_DIR_PROPERTY)
		def previousFull = System.getProperty(LoadParams.FULL_LOAD_PROPERTY)
		try {
			System.setProperty(LoadParams.BASE_DIR_PROPERTY, directory.toString())
			def paths = []
			def loader = new Expando(loadFile: { String path -> paths << new File(path).name; 1 })
			System.setProperty(LoadParams.FULL_LOAD_PROPERTY, 'true')
			new ATPTennisLoader().loadMatches(loader)
			assert paths == ['atp_matches_1968.csv', 'atp_matches_2025.csv', 'atp_matches_2026.csv']
			paths.clear()
			System.setProperty(LoadParams.FULL_LOAD_PROPERTY, 'false')
			new ATPTennisLoader().loadMatches(loader)
			assert paths == ['atp_matches_2025.csv', 'atp_matches_2026.csv']
		}
		finally {
			restore(LoadParams.BASE_DIR_PROPERTY, previousDir)
			restore(LoadParams.FULL_LOAD_PROPERTY, previousFull)
		}
	}

	private File csv(String name, String content) {
		def file = directory.resolve(name).toFile()
		file.setText(content, 'UTF-8')
		file
	}

	private static void restore(String key, String value) {
		if (value == null) System.clearProperty(key)
		else System.setProperty(key, value)
	}

	private static class CapturingLoader extends BaseCSVLoader {
		List columns
		List records = []
		CapturingLoader(List columns) { super(null); this.columns = columns }
		List columnNames() { columns }
		String loadSql() { '' }
		int batchSize() { 1 }
		def params(record, Connection conn) { null }
		def load(Iterator data) { data.each { records << it }; records.size() }
	}
}
