package org.strangeforest.tcb.stats.model.records;

import org.junit.jupiter.api.Test;
import org.strangeforest.tcb.stats.service.RecordFilter;

import static org.assertj.core.api.Assertions.assertThat;

class RankingRecordsTest {

    @Test void findsAtpTopFourWeeksByDisplayedName() {
        var filter = new RecordFilter(null, "Most Weeks at ATP Top 4", false);
        assertThat(Records.getRecords().stream().filter(filter::predicate))
            .extracting(Record::getId).containsExactly("WeeksAtATPTop4");
        var record = Records.getRecord("WeeksAtATPTop4");
        assertThat(record.getSql()).contains("best_rank <= 4", "WHERE rank <= 4");
    }

    @Test void includesTopFourAlongsideExistingRankingThresholds() {
        for (String prefix : new String[]{"WeeksAtATP", "ConsecutiveWeeksAtATP", "WeeksAtElo", "WeeksAtHardElo", "EndsOfSeasonAtATP", "ConsecutiveEndsOfSeasonAtATP"}) {
            for (int top : new int[]{2, 3, 4, 5, 10, 20}) {
                assertThat(Records.getRecord(prefix + "Top" + top).getName()).contains("Top " + top);
            }
        }
    }
}
