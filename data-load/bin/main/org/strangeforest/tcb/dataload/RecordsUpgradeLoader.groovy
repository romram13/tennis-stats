package org.strangeforest.tcb.dataload

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import org.strangeforest.tcb.stats.model.records.Records
import org.strangeforest.tcb.stats.service.RecordsService

class RecordsUpgradeLoader {

	static final String MIGRATION = 'records-uts-2026-10-07'

	def upgrade() {
		if (System.getenv('TCB_DB_PASSWORD') != null)
			System.setProperty(SqlPool.PASSWORD_PROPERTY, System.getenv('TCB_DB_PASSWORD'))
		def dataSource = SqlPool.dataSource()
		def template = new NamedParameterJdbcTemplate(dataSource)
		def jdbc = template.jdbcOperations
		def service = new RecordsService(template)
		new TransactionTemplate(new DataSourceTransactionManager(dataSource)).execute {
			jdbc.execute('CREATE TABLE IF NOT EXISTS data_migration (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())')
			jdbc.execute("SELECT pg_advisory_xact_lock(hashtext('$MIGRATION'))")
			if (jdbc.queryForObject('SELECT count(*) FROM data_migration WHERE id = ?', Integer, MIGRATION)) {
				println 'Records UTS : correction déjà appliquée.'
				return
			}
			println 'Mise à jour des records et des barèmes GOAT UTS…'
			jdbc.execute(resource('records-uts-2026.sql'))
			def recordIds = resource('records-uts-2026.ids').readLines().findAll { it }
			recordIds.eachWithIndex { id, i ->
				service.refreshRecord(id, false)
				if ((i + 1) % 10 == 0) println "Records ajoutés : ${i + 1}/${recordIds.size()}"
			}
			jdbc.execute('REFRESH MATERIALIZED VIEW player_goat_points')
			jdbc.execute('REFRESH MATERIALIZED VIEW player_surface_goat_points')
			Records.getRecords().findAll {
				it.category.id in ['GOATPoints', 'TheBestPlayerThatNever', 'MostRecords', 'MostInfamousRecords']
			}.each { service.refreshRecord(it.id, false) }
			service.clearActivePlayersRecords()
			jdbc.update('INSERT INTO data_migration (id) VALUES (?)', MIGRATION)
			println "Correction appliquée : ${Records.recordCount} records, 109 barèmes de records GOAT globaux."
		}
	}

	private static String resource(String name) {
		def stream = RecordsUpgradeLoader.getResourceAsStream('/updates/' + name)
		if (stream == null) throw new IllegalStateException('Ressource absente : ' + name)
		stream.withCloseable { it.getText('UTF-8') }
	}
}
