package org.strangeforest.tcb.stats.model.records.categories;

import java.util.*;
import org.strangeforest.tcb.stats.model.core.PerformanceCategory;
import org.strangeforest.tcb.stats.model.records.*;
import org.strangeforest.tcb.stats.model.records.details.OpponentRankPctRecordDetail;
import static org.strangeforest.tcb.stats.model.records.RecordDomain.*;

public class OpponentRankPctCategory extends RecordCategory {
    public OpponentRankPctCategory() {
        super("Opponent Rank Percentages");
        for (var opponent : List.of(NO_1_FILTER, TOP_5_FILTER, TOP_10_FILTER)) {
            for (var domain : List.of(ALL, GRAND_SLAM, MASTERS, HARD, CLAY, GRASS, CARPET, OUTDOOR, INDOOR))
                register(opponentPct(domain, opponent, false));
            register(opponentPct(ALL, opponent, true));
        }
    }

    private static Record opponentPct(RecordDomain domain, RecordDomain opponent, boolean season) {
        int minMatches = PerformanceCategory.get(domain.perfCategory).getMinEntries() / (season ? 10 : 1);
        String seasonColumn = season ? ", season" : "";
        String items = "count(*) FILTER (WHERE opponent_rank " + opponent.condition + ")";
        List<RecordColumn> columns = new ArrayList<>(List.of(
            new RecordColumn("value", null, "valueUrl", "150", "right", "Vs " + opponent.name + " Pct."),
            new RecordColumn("items", "numeric", null, "100", "right", "Vs " + opponent.name),
            new RecordColumn("total", "numeric", null, "80", "right", "Total")
        ));
        if (season) columns.add(new RecordColumn("season", "numeric", null, "80", "center", "Season"));
        return new Record<>(
            (season ? "Season" : "") + "Highest" + domain.id + opponent.id + "OpponentRankPct",
            "Highest " + suffix(domain.name, " ") + opponent.name + " Opponent Rank Pct." + (season ? " in Single Season" : ""),
            "SELECT player_id" + seasonColumn + ", " + items + " AS items, count(*) AS total, "
                + items + "::REAL / count(*) AS pct FROM player_match_for_stats_v"
                + (domain.condition.isEmpty() ? "" : " WHERE " + domain.condition)
                + " GROUP BY player_id" + seasonColumn + " HAVING count(*) >= " + minMatches,
            "r.items, r.total" + (season ? ", r.season" : ""), "r.pct DESC",
            "r.pct DESC, r.total DESC" + (season ? ", r.season" : ""),
            OpponentRankPctRecordDetail.class, (playerId, detail) -> "/playerProfile?playerId=" + playerId
                + "&tab=matches" + domain.urlParam + (season ? "&season=" + detail.getSeason() : ""),
            columns, "Minimum " + minMatches + " matches"
        );
    }
}
