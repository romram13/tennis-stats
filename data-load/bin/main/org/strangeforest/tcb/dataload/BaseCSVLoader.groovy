package org.strangeforest.tcb.dataload

import java.sql.*
import java.text.*
import java.util.concurrent.*

import org.strangeforest.tcb.util.*

import com.google.common.base.*
import com.xlson.groovycsv.*

import static org.strangeforest.tcb.dataload.LoaderUtil.*

abstract class BaseCSVLoader {

	protected final SqlPool sqlPool

	private static final String DEADLOCK_DETECTED = "40P01"

	BaseCSVLoader(SqlPool sqlPool) {
		this.sqlPool = sqlPool
	}

	List columnNames() { null }
	int threadCount() { Integer.MAX_VALUE }
	abstract String loadSql()
	abstract int batchSize()
	abstract def params(record, Connection conn)

	def loadFile(String file, boolean readFirstLine = false) {
		println "Loading file '$file'"
		def stopwatch = Stopwatch.createStarted()
		int rows = new File(file).withReader('UTF-8') { reader ->
			def csvParams = [readFirstLine: readFirstLine]
			List columns = columnNames()
			if (columns) {
				reader.mark(65536)
				def firstLine = reader.readLine()?.replace('\uFEFF', '')
				reader.reset()
				if (!firstLine)
					throw new IllegalArgumentException("Empty CSV file: $file")
				def header = firstLine.split(',').collect { it.trim().replace('"', '') }
				def aliases = [name_first: 'first_name', name_last: 'last_name', ioc: 'country',
					ranking_date: 'rank_date', player: 'player_id', points: 'rank_points']
				if (!(header[0] ==~ /\d+/)) {
					header = header.collect { aliases[it] ?: it }
					if (!header.containsAll(columns))
						throw new IllegalArgumentException("Missing CSV columns in ${file}: ${columns - header}")
					csvParams.columnNames = header
					csvParams.readFirstLine = false
				}
				else {
					csvParams.columnNames = columns
					csvParams.readFirstLine = true
				}
			}
			load(CsvParser.parseCsv(csvParams, reader))
		}
		printLoadInfo(stopwatch, rows)
		return rows
	}

	def load(Iterable data) {
		def stopwatch = Stopwatch.createStarted()
		int rows = load(data.iterator())
		printLoadInfo(stopwatch, rows)
		return rows
	}

	static printLoadInfo(Stopwatch stopwatch, int rows) {
		println()
		stopwatch.stop()
		def seconds = stopwatch.elapsed(TimeUnit.SECONDS)
		int rowsPerSecond = seconds ? rows / seconds : 0
		println "Rows: $rows in $stopwatch ($rowsPerSecond row/s)"
	}

	def load(Iterator data) {
		def loadSql = loadSql()
		def batchSize = batchSize()
		def rows = 0
		def batches = new ProgressTicker('.' as char, 1).withDownstreamTicker(ProgressTicker.newLineTicker())
		def paramsBatch = []
		if (sqlPool.size() < 2)
			throw new IllegalArgumentException("At least 2 DB connections are required for CVS data load, check ${SqlPool.DB_CONNECTIONS_PROPERTY}")
		sqlPool.withSql { sql ->
			def executor = Executors.newFixedThreadPool(Math.min(sqlPool.size(), threadCount()))
			def futures = []
			try {
				def paramsConn = sql.connection
				for (record in data) {
					if (record.values.size() <= 1)
						continue
					try {
						def params = params(record, paramsConn)
						if (params) {
							paramsBatch << params
							if (++rows % batchSize == 0) {
								futures << execute(executor, loadSql, paramsBatch, batches)
								paramsBatch = []
							}
						}
					}
					catch (Exception ex) {
						throw new Exception("Error processing record $record", ex)
					}
				}
				if (paramsBatch)
					futures << execute(executor, loadSql, paramsBatch, batches)
				executor.shutdown()
				// Surface worker failures so a broken import cannot report success.
				futures.each { it.get() }
			}
			finally {
				executor.shutdownNow()
			}
		}
		rows
	}

	def execute(ExecutorService executor, String loadSql, Collection<Map> paramsBatch, ProgressTicker batches) {
		executor.submit({
			executeWithBatch(loadSql, paramsBatch)
			batches.tick()
		} as Runnable)
	}

	def executeWithBatch(String loadSql, Collection<Map> paramsBatch) {
		sqlPool.withSql { sql ->
			try {
				sql.withBatch(loadSql) { ps ->
					paramsBatch.each { params ->
						ps.addBatch(params)
					}
				}
			}
			catch (BatchUpdateException buEx) {
				switch (buEx.getSQLState()) {
					case DEADLOCK_DETECTED:
						print '*'
						for (def paramsSubBatch : tile(paramsBatch))
							executeWithBatch(loadSql, paramsSubBatch)
						break
					default:
						throw buEx
				}
			}
		}
	}

	// Data conversion

	static String string(s, d = null) {
		s ?: d
	}

	static Integer integer(i) {
		i ? i.toInteger() : null
	}

	static Short smallint(i) {
		i ? i.toShort() : null
	}

	static BigDecimal decimal(d) {
		d ? d.toBigDecimal() : null
	}

	static BigDecimal safeDecimal(d) {
		try {
			d ? d.toBigDecimal() : null
		}
		catch (NumberFormatException ex) {
			null
		}
	}

	static Float real(f) {
		f ? f.toFloat() : null
	}

	static Date date(d) {
		if (d) {
			switch (d.length()) {
				case 4: d += '0701'; break
				case 6: d += '15'; break
			}
			new Date(new SimpleDateFormat('yyyyMMdd').parse(d).time)
		}
		else
			null
	}

	static Array shortArray(conn, a) {
		conn.createArrayOf('smallint', a)
	}

	static String country(c, d = null) {
		try {
			c && Country.code(c) ? c : d
		}
		catch (IllegalArgumentException ignored) {
			System.err.println "WARN: Unsupported country code '$c'; using '${d ?: 'null'}'"
			d
		}
	}

	static String hand(c) {
		switch (c) {
			case 'R': return 'R'
			case 'L': return 'L'
			default: return null
		}
	}

	static Object safeProperty(obj,  String propName) {
		obj.toMap()[propName]
	}
}
