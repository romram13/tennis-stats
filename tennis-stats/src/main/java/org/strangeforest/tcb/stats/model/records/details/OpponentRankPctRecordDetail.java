package org.strangeforest.tcb.stats.model.records.details;

import java.util.Locale;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.strangeforest.tcb.stats.model.records.RecordDetail;

public class OpponentRankPctRecordDetail implements RecordDetail<String> {
    private final int items;
    private final int total;
    private final Integer season;

    public OpponentRankPctRecordDetail(@JsonProperty("items") int items,
                                      @JsonProperty("total") int total,
                                      @JsonProperty("season") Integer season) {
        this.items = items;
        this.total = total;
        this.season = season;
    }

    public int getItems() { return items; }
    public int getTotal() { return total; }
    public Integer getSeason() { return season; }
    @Override public String getValue() {
        return String.format(Locale.ROOT, "%.2f%%", 100.0 * items / total);
    }
    @Override public String toDetailString() { return season == null ? "" : season.toString(); }
}
