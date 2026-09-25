package org.strangeforest.tcb.dataload

import groovy.mock.interceptor.MockFor
import org.junit.jupiter.api.Test

class CSVImportPipelineTest {

	@Test void 'full import uses CSV and computes statistics without legacy enrichment'() {
		verifyImport(true)
	}

	@Test void 'delta entry point forces delta and skips legacy enrichment'() {
		verifyImport(false)
	}

	private static void verifyImport(boolean full) {
		def previous = System.getProperty(LoadParams.FULL_LOAD_PROPERTY)
		// An empty pool avoids opening a database connection in this orchestration test.
		def emptyPool = new SqlPool(-1)
		def pool = new MockFor(SqlPool, true)
		pool.demand.SqlPool { -> emptyPool }
		pool.demand.withSql(6) { Closure action -> action(null) }

		// Strict mocks reject unexpected calls, including all legacy enrichment methods.
		def loader = new MockFor(ATPTennisLoader)
		loader.demand.loadPlayers { PlayerLoader csv -> assert csv != null }
		loader.demand.loadRankings { RankingLoader csv -> assert csv != null }
		loader.demand.loadMatches { MatchLoader csv -> assert csv != null }
		loader.demand.vacuum { sql -> }
		loader.demand.vacuum { sql -> }
		loader.demand.refreshMaterializedViews { sql -> }
		loader.demand.vacuum { sql -> }
		loader.demand.vacuum { sql -> }

		def elo = new MockFor(EloRatingsRunner)
		elo.demand.computeEloRatings { Boolean fullLoad -> assert fullLoad == full }
		def records = new MockFor(RecordsLoader)
		records.demand.loadRecords { atpLoader, sql -> }
		try {
			System.setProperty(LoadParams.FULL_LOAD_PROPERTY, 'true')
			pool.use {
				loader.use {
					elo.use {
						records.use {
							if (full) new LoadATPTennis().run()
							else new LoadATPTennisNew().run()
						}
					}
				}
			}
		}
		finally {
			if (previous == null) System.clearProperty(LoadParams.FULL_LOAD_PROPERTY)
			else System.setProperty(LoadParams.FULL_LOAD_PROPERTY, previous)
		}
	}
}
