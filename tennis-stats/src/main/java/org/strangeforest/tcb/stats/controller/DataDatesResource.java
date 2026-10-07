package org.strangeforest.tcb.stats.controller;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DataDatesResource {

    private final JdbcTemplate jdbcTemplate;

    public DataDatesResource(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // These are dates covered by the imported data, not import timestamps.
    @GetMapping("/dataDates")
    public Map<String, LocalDate> dataDates() {
        return jdbcTemplate.queryForObject(
            "SELECT (SELECT max(date) FROM match) AS matches, "
                + "(SELECT max(rank_date) FROM player_ranking) AS atp, "
                + "(SELECT max(rank_date) FROM player_elo_ranking) AS elo",
            (rs, rowNum) -> {
                Map<String, LocalDate> dates = new LinkedHashMap<>();
                dates.put("matches", rs.getObject("matches", LocalDate.class));
                dates.put("atp", rs.getObject("atp", LocalDate.class));
                dates.put("elo", rs.getObject("elo", LocalDate.class));
                return dates;
            }
        );
    }
}
