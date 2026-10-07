package org.strangeforest.tcb.stats.model.records.categories;

import java.util.*;
import org.strangeforest.tcb.stats.model.records.*;
import org.strangeforest.tcb.stats.model.records.details.TournamentEventIntegerRecordDetail;

public class GrandSlamCoverageCategory extends RecordCategory {
    public GrandSlamCoverageCategory(boolean infamous) {
        super(infamous ? "Matches Lost at Each Grand Slam" : "Results at Each Grand Slam");
        if (infamous) register(coverage("MatchesLostAtEachGrandSlamTournament", "Most Matches Lost at Each Grand Slam Tournament", "o_matches = 1", true, "Matches"));
        else {
            register(coverage("MostTitlesAtEachGrandSlam", "Most Titles at Each Grand Slam Tournament", "result = 'W'", false, "Titles"));
            register(coverage("MostFinalsAtEachGrandSlam", "Most Finals at Each Grand Slam Tournament", "result >= 'F'", false, "Finals"));
            register(coverage("MostSemiFinalsAtEachGrandSlam", "Most Semi-Finals at Each Grand Slam Tournament", "result >= 'SF'", false, "Semi-Finals"));
            register(coverage("MostQuarterFinalsAtEachGrandSlam", "Most Quarter-Finals at Each Grand Slam Tournament", "result >= 'QF'", false, "Quarter-Finals"));
            register(coverage("MostEntriesAtEachGrandSlam", "Most Entries at Each Grand Slam Tournament", "result IS NOT NULL", false, "Entries"));
            register(coverage("MatchesPlayedAtEachGrandSlamTournament", "Most Matches Played at Each Grand Slam Tournament", "TRUE", true, "Matches"));
            register(coverage("MatchesWonAtEachGrandSlamTournament", "Most Matches Won at Each Grand Slam Tournament", "p_matches = 1", true, "Matches"));
        }
    }

    private static Record coverage(String id, String name, String condition, boolean matches, String caption) {
        // The value is the minimum across all four Slams. The detail identifies
        // the event at which that number was first reached at the fourth Slam.
        String source = matches ? "player_match_for_stats_v" : "player_tournament_event_result";
        String order = matches ? "m.date, m.match_id" : "e.date, e.tournament_event_id";
        String sql = "WITH progress AS (SELECT m.player_id, e.tournament_id, e.tournament_event_id, e.date, "
            + "row_number() OVER (PARTITION BY m.player_id, e.tournament_id ORDER BY " + order + ") AS value "
            + "FROM " + source + " m JOIN tournament_event e USING (tournament_event_id) "
            + "WHERE e.level = 'G' AND " + condition + "), totals AS ("
            + "SELECT player_id, tournament_id, max(value) AS value FROM progress GROUP BY player_id, tournament_id), "
            + "coverage AS (SELECT player_id, min(value) AS value FROM totals GROUP BY player_id HAVING count(*) = 4), "
            + "achievement AS (SELECT p.*, row_number() OVER (PARTITION BY p.player_id ORDER BY p.date DESC, p.tournament_event_id DESC) AS n "
            + "FROM progress p JOIN coverage c ON c.player_id = p.player_id AND c.value = p.value) "
            + "SELECT a.player_id, a.value, e.season, e.name AS tournament, e.level, a.tournament_event_id "
            + "FROM achievement a JOIN tournament_event e USING (tournament_event_id) WHERE a.n = 1";
        return new Record<>(id, name, sql,
            "r.value, r.season, r.tournament, r.level, r.tournament_event_id", "r.value DESC", "r.value DESC, r.season, r.tournament_event_id",
            TournamentEventIntegerRecordDetail.class, (playerId, detail) -> "/playerProfile?playerId=" + playerId + "&tab=events&level=G",
            List.of(new RecordColumn("value", null, "valueUrl", "120", "right", caption),
                new RecordColumn("season", "numeric", null, "80", "center", "Season"),
                new RecordColumn("tournament", null, "tournamentEvent", "120", "left", "Tournament")));
    }
}
