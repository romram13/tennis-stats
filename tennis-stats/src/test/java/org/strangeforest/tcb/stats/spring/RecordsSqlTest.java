package org.strangeforest.tcb.stats.spring;

import java.sql.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.strangeforest.tcb.stats.model.records.Records;
import static org.assertj.core.api.Assertions.assertThat;

@EnabledIfEnvironmentVariable(named = "TCB_TEST_DB_URL", matches = ".+")
class RecordsSqlTest {
    @Test void eachGrandSlamRequiresFourTournamentsAndUsesTheMinimum() throws Exception {
        try (var connection = DriverManager.getConnection(System.getenv("TCB_TEST_DB_URL"), "tcb",
                System.getenv().getOrDefault("TCB_DB_PASSWORD", "tcb"))) {
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                statement.execute("CREATE TEMP TABLE tournament_event (tournament_event_id INTEGER, tournament_id INTEGER, date DATE, season INTEGER, name TEXT, level TEXT)");
                statement.execute("CREATE TEMP TABLE player_tournament_event_result (player_id INTEGER, tournament_event_id INTEGER, result TEXT)");
                int eventId = 0;
                for (int player = 1; player <= 2; player++) {
                    for (int tournament = 1; tournament <= 4; tournament++) {
                        int titles = player == 1 ? (tournament == 1 ? 3 : 2) : (tournament == 4 ? 0 : 5);
                        for (int title = 1; title <= titles; title++) {
                            eventId++;
                            int season = 2010 + title;
                            statement.execute("INSERT INTO tournament_event VALUES (" + eventId + "," + tournament + ",'" + season + "-0" + tournament + "-01'," + season + ",'Slam " + tournament + "','G')");
                            statement.execute("INSERT INTO player_tournament_event_result VALUES (" + player + "," + eventId + ",'W')");
                        }
                    }
                }
                try (var rs = statement.executeQuery(Records.getRecord("MostTitlesAtEachGrandSlam").getSql())) {
                    assertThat(rs.next()).isTrue();
                    assertThat(rs.getInt("player_id")).isEqualTo(1);
                    assertThat(rs.getInt("value")).isEqualTo(2);
                    assertThat(rs.getInt("season")).isEqualTo(2012);
                    assertThat(rs.getString("tournament")).isEqualTo("Slam 4");
                    assertThat(rs.next()).isFalse();
                }
            } finally {
                connection.rollback(); // Fixtures never modify the real data.
            }
        }
    }
}
