package org.strangeforest.tcb.dataload

import com.google.common.base.*

println 'Chargement des données tennistiques'
def stopwatch = Stopwatch.createStarted()

def sqlPool = new SqlPool()
def loader = new ATPTennisLoader()

loader.loadPlayers(new PlayerLoader(sqlPool))
sqlPool.withSql { sql -> loader.loadAdditionalPlayerData(sql) }

loader.loadRankings(new RankingLoader(sqlPool))
sqlPool.withSql { sql -> loader.loadAdditionalRankingData(sql) }
sqlPool.withSql { sql -> MissingRankingsLoader.loadRankings(sql) }
LoadNewRankings.loadRankings(sqlPool)

loader.loadMatches(new MatchLoader(sqlPool))
sqlPool.withSql { sql -> loader.loadAdditionalTournamentData(sql) }
LoadNewTournaments.loadTournaments(sqlPool)

sqlPool.withSql { sql -> loader.vacuum(sql) }

if (LoadParams.getBooleanProperty(LoadParams.FULL_LOAD_PROPERTY, LoadParams.FULL_LOAD_DEFAULT)) {
	sqlPool.withSql { sql -> loader.correctDataFull(sql) }
}

EloRatingsRunner.computeEloRatings(LoadParams.getBooleanProperty(LoadParams.FULL_LOAD_PROPERTY, LoadParams.FULL_LOAD_DEFAULT))

sqlPool.withSql { sql -> loader.vacuum(sql) }

sqlPool.withSql { sql -> loader.correctData(sql) }
sqlPool.withSql { sql -> loader.refreshMaterializedViews(sql) }

sqlPool.withSql { sql -> loader.vacuum(sql) }

sqlPool.withSql { sql -> new RecordsLoader().loadRecords(loader, sql) }


sqlPool.withSql { sql -> loader.vacuum(sql) }

println "Données chargées en $stopwatch"
