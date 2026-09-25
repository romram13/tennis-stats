package org.strangeforest.tcb.dataload

import groovy.cli.commons.*

import static org.strangeforest.tcb.dataload.LoadParams.*

def cli = new CliBuilder(usage: 'data-load [commands]', header: 'Commands:')
cli.bd(args: 1, argName: 'Base Data Directory', 'Base Data Directory where CSV data files are located [required for -lt]')
cli.url(args: 1, argName: 'JDBC URL', 'Database JDBC URL [default tcb]')
cli.u(args: 1, argName: 'DB username', 'Database login username [default tcb]')
cli.p(args: 1, argName: 'DB password', 'Database login password [default tcb]')
cli.c(args: 1, argName: 'DB connections', 'Number of database connections to allocate [default 2]')
cli.t(args: 1, argName: 'Processing threads', 'Number of processing threads to use (Elo Ratings) [default 8]')
cli.f('Full load [default]')
cli.d('Delta load')
cli.ie('Installer les extensions de la base de données')
cli.dd('Drop database objects')
cli.cd('Créer les objets de la base de données')
cli.lt('Charger les données CSV locales et recalculer les statistiques')
cli.ln('Charger les données CSV locales en mode delta')
cli.lp('Charger des données supplémentaires sur les joueurs')
cli.la('Charger les classements et tournois ad hoc')
cli.nr('Charger les nouveaux classements')
cli.nt('Charger les nouveaux tournois terminés')
cli.el('Calculer les cotes Elo')
cli.rc('Actualiser les données calculées')
cli.rr('Actualiser les records')
cli.rp(args: 1, argName: 'Records pause', 'Pause between refreshing 100 records in ms [default 2000]')
cli.ip('Charger les tournois en cours')
cli.ff('Forcer la prévision des tournois en cours')
cli.vc('Nettoyer l\'espace')
cli.cc('Vider les caches')
cli.rsc('Redémarrer le connecteur')
cli.help('Print this message')
def options = cli.parse(args)

if (options && (options.ie || options.dd || options.cd || options.lt || options.ln || options.lp || options.la || options.nr || options.nt || options.el || options.rc || options.rr || options.rp || options.ip || options.ff || options.vc || options.cc || options.rsc)) {
	setProperties(options)

	if (options.ie)
		callLoader('installExtensions')
	if (options.dd)
		callLoader('dropDatabase')
	if (options.cd)
		callLoader('createDatabase')
	if (options.lt)
		new LoadATPTennis().run()
	if (options.ln)
		new LoadATPTennisNew().run()
	if (options.lp) {
		callLoader('loadAdditionalPlayerData')
		new UpdatePlayerData().run()
	}
	if (options.la) {
		new LoadAdHocRankings().run()
		new LoadAdHocTournaments().run()
	}
	if (options.nr)
		new LoadNewRankings().run()
	if (options.nt)
		new LoadNewTournaments().run()
	if (options.el)
		new ComputeEloRatings().run()
	if (options.rc) {
		callLoader('refreshMaterializedViews')
	}
	if (options.rr) {
		new SqlPool().withSql { sql ->
			new RecordsLoader().loadRecords(new ATPTennisLoader(), sql)
		}
	}
	if (options.ip)
		new LoadInProgressTournaments().run()
	if (options.vc)
		callLoader('vacuum')
	if (options.cc)
		JMXFacade.clearCaches()
	if (options.rsc)
		JMXFacade.restartConnector()
}
else
	cli.usage()

static def setProperties(def options) {
	setProperty(options.getProperty('bd'), BASE_DIR_PROPERTY)
	setProperty(options.getProperty('url'), SqlPool.DB_URL_PROPERTY)
	setProperty(options.getProperty('u'), SqlPool.USERNAME_PROPERTY)
	setProperty(options.getProperty('p'), SqlPool.PASSWORD_PROPERTY)
	setProperty(options.getProperty('c'), SqlPool.DB_CONNECTIONS_PROPERTY)
	setBooleanProperty(options.getProperty('f'), FULL_LOAD_PROPERTY, true)
	setBooleanProperty(options.getProperty('d'), FULL_LOAD_PROPERTY, false)
	setBooleanProperty(options.getProperty('ff'), FORCE_FORECAST_PROPERTY, true)
	setProperty(options.getProperty('rp'), RECORD_PAUSE_PROPERTY)
	setProperty(options.getProperty('t'), THREADS_PROPERTY)
}

static def setProperty(cmdArgument, String systemProperty) {
	if (cmdArgument)
		System.setProperty(systemProperty, String.valueOf(cmdArgument).trim())
}

static def setBooleanProperty(cmdArgument, String systemProperty, boolean value) {
	if (cmdArgument)
		System.setProperty(systemProperty, String.valueOf(value))
}

static def callLoader(methodName) {
	new SqlPool().withSql { sql ->
		new ATPTennisLoader()."$methodName"(sql)
	}
}