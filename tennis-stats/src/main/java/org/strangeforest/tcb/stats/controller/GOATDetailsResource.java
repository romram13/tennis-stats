package org.strangeforest.tcb.stats.controller;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.strangeforest.tcb.stats.model.*;
import org.strangeforest.tcb.stats.model.core.Surface;
import org.strangeforest.tcb.stats.service.*;

@RestController
public class GOATDetailsResource {
    private final GOATPointsService points;
    private final GOATLegendService legend;
    private final PlayerService players;

    public GOATDetailsResource(GOATPointsService points, GOATLegendService legend, PlayerService players) {
        this.points = points; this.legend = legend; this.players = players;
    }

    @GetMapping("/players/{playerId}/goat")
    public Map<String, Object> player(@PathVariable int playerId, @RequestParam(defaultValue = "") String surface) {
        if (playerId <= 0 || !surface.matches("[HCGP]?"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid player or surface");
        players.getPlayer(playerId);
        var p = points.getPlayerGOATPoints(playerId, surface.isEmpty() ? null : Surface.decode(surface), true);
        var result = totals(p.getTotalPoints(), p.getTournamentPoints(), p.getRankingPoints(), p.getAchievementsPoints());
        result.put("careerRankingPoints", p.getCareerRankingPoints());
        result.put("careerAchievementsPoints", p.getCareerAchievementsPoints());
        result.put("tournamentResults", breakdown(p.getTournamentBreakdown()));
        var seasons = new ArrayList<Map<String, Object>>();
        for (var s : p.getPlayerSeasonsPoints()) {
            var row = totals(s.getTotalPoints(), s.getTournamentPoints(), s.getRankingPoints(), s.getAchievementsPoints());
            row.put("season", s.getSeason());
            row.put("yearEndRankPoints", s.getYearEndRankPoints());
            row.put("weeksAtNo1Points", s.getWeeksAtNo1Points());
            row.put("weeksAtEloTopNPoints", s.getWeeksAtEloTopNPoints());
            row.put("grandSlamPoints", s.getGrandSlamPoints());
            row.put("bigWinsPoints", s.getBigWinsPoints());
            row.put("tournamentResults", breakdown(s.getTournamentBreakdown()));
            seasons.add(row);
        }
        result.put("seasons", seasons);
        return result;
    }

    private Map<String, Object> totals(int total, Number tournaments, Number rankings, Number achievements) {
        var row = new LinkedHashMap<String, Object>();
        row.put("totalPoints", total);
        row.put("tournamentPoints", tournaments == null ? 0 : tournaments);
        row.put("rankingPoints", rankings == null ? 0 : rankings);
        row.put("achievementsPoints", achievements == null ? 0 : achievements);
        return row;
    }

    private List<Map<String, Object>> breakdown(PlayerTournamentGOATPoints points) {
        var rows = new ArrayList<Map<String, Object>>();
        this.points.getLevelResults().forEach((level, results) -> results.forEach(result -> {
            Integer count = points.getResultCount(level, result);
            if (count != null && count > 0) rows.add(Map.of("level", level, "result", result, "count", count, "unit", "T".equals(level) ? "points" : "results"));
        }));
        return rows;
    }

    @GetMapping("/goat/legend")
    public Map<String, Object> legend() {
        return Map.of(
            "tournaments", legend.getTournamentGOATPoints(),
            "yearEndRank", legend.getYearEndRankGOATPoints(),
            "bestRank", legend.getBestRankGOATPoints(),
            "weeksAtNo1", legend.getWeeksAtNo1ForGOATPoint(),
            "bestElo", legend.getBestEloRatingGOATPoints(),
            "careerGrandSlam", legend.getCareerGrandSlamGOATPoints(),
            "seasonGrandSlam", legend.getSeasonGrandSlamGOATPoints()
        );
    }
}
