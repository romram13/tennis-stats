package org.strangeforest.tcb.stats.spring;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.strangeforest.tcb.stats.model.records.Records;
import static org.assertj.core.api.Assertions.assertThat;

class RecordsCatalogueTest {
    @Test void matchesTheAuditedUtsCatalogue() throws Exception {
        assertThat(Records.getRecordCount()).isEqualTo(1938);
        assertThat(Records.getRecords()).hasSize(1938); // No overwritten IDs.
        assertThat(Records.getRecords().stream().filter(r -> r.isInfamous()).count()).isEqualTo(407);
        var expected = new ObjectMapper().readTree(getClass().getResourceAsStream("/records/uts-additions-2026.json"));
        assertThat(expected.size()).isEqualTo(107);
        for (var entry : expected) {
            var record = Records.getRecord(entry.get("id").asText());
            assertThat(record.getName()).isEqualTo(entry.get("name").asText());
            assertThat(record.isInfamous()).isEqualTo(entry.get("infamous").asBoolean());
        }
    }

    @Test void opponentPercentageDetailsExposeTheCountsAndSeason() throws Exception {
        var record = Records.getRecord("SeasonHighestNo1OpponentRankPct");
        var detail = record.getDetailFactory().createDetail("{\"items\":2,\"total\":20,\"season\":2025}");
        assertThat(detail.getValue()).isEqualTo("10.00%");
        assertThat(detail.toDetailString()).isEqualTo("2025");
    }
}
