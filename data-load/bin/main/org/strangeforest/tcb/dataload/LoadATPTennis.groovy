package org.strangeforest.tcb.dataload

import com.google.common.base.*

// CSV imports must not depend on the legacy historical snapshot or web scrapers.
println 'Chargement des données tennistiques depuis les CSV locaux'
def stopwatch = Stopwatch.createStarted()

def sqlPool = new SqlPool()
def loader = new ATPTennisLoader()

loader.loadPlayers(new PlayerLoader(sqlPool))

loader.loadRankings(new RankingLoader(sqlPool))

loader.loadMatches(new MatchLoader(sqlPool))

sqlPool.withSql { sql -> loader.vacuum(sql) }

EloRatingsRunner.computeEloRatings(LoadParams.getBooleanProperty(LoadParams.FULL_LOAD_PROPERTY, LoadParams.FULL_LOAD_DEFAULT))

sqlPool.withSql { sql -> loader.vacuum(sql) }

sqlPool.withSql { sql -> loader.refreshMaterializedViews(sql) }

sqlPool.withSql { sql -> loader.vacuum(sql) }

sqlPool.withSql { sql -> new RecordsLoader().loadRecords(loader, sql) }


sqlPool.withSql { sql -> loader.vacuum(sql) }

println "Données chargées en $stopwatch"
