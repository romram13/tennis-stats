package org.strangeforest.tcb.stats.spring;

import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.strangeforest.tcb.stats.controller.*;
import org.strangeforest.tcb.stats.model.*;
import org.strangeforest.tcb.stats.model.core.Surface;
import org.strangeforest.tcb.stats.model.table.BootgridTable;
import org.strangeforest.tcb.stats.service.*;
import org.strangeforest.tcb.stats.util.NotFoundException;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(GOATApiTest.Config.class)
@WebAppConfiguration
@TestPropertySource(properties = "tennis-stats.api.allowed-origins=http://localhost:3000")
class GOATApiTest {
    @Autowired WebApplicationContext context;
    @MockBean GOATPointsService points;
    @MockBean GOATLegendService legend;
    @MockBean PlayerService players;
    @MockBean GOATListService list;
    @MockBean MatchesService matches;
    MockMvc mvc;
    @BeforeEach void setup() {
        reset(points, legend, players, list, matches);
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
        when(points.getLevelResults()).thenReturn(Map.of("G", List.of("W", "F")));
    }
    @Test void serializesSeasonsAndSparseTournamentResultsWithoutLosingCareerBonuses() throws Exception {
        var p = new PlayerGOATPoints(Surface.CLAY);
        p.setTotalPoints(150); p.setTournamentPoints(100); p.setRankingPoints(40); p.setAchievementsPoints(10);
        p.setBestRankPoints(20); p.setH2hPoints(10);
        var season = new PlayerSeasonGOATPoints(2025, Surface.CLAY, 120);
        season.setTournamentPoints(100); season.setRankingPoints(20); season.setWeeksAtEloTopNPoints(20.25);
        season.getTournamentBreakdown().addResultCount("G", "W", 1, 0);
        p.setPlayerSeasonsPoints(List.of(season)); p.aggregateTournamentBreakdownAndMergeTourFinals();
        when(points.getPlayerGOATPoints(1, Surface.CLAY, true)).thenReturn(p);
        mvc.perform(get("/api/v1/players/1/goat?surface=C"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalPoints").value(150))
            .andExpect(jsonPath("$.careerRankingPoints").value(20))
            .andExpect(jsonPath("$.careerAchievementsPoints").value(10))
            .andExpect(jsonPath("$.seasons[0].totalPoints").value(120))
            .andExpect(jsonPath("$.seasons[0].achievementsPoints").value(0))
            .andExpect(jsonPath("$.seasons[0].weeksAtEloTopNPoints").value(20.25))
            .andExpect(jsonPath("$.tournamentResults.length()").value(1))
            .andExpect(jsonPath("$.tournamentResults[0].count").value(1));
        verify(players).getPlayer(1);
    }
    @Test void validatesSurfaceAndUnknownPlayers() throws Exception {
        mvc.perform(get("/api/v1/players/1/goat?surface=X")).andExpect(status().isBadRequest());
        verifyNoInteractions(points);
        when(players.getPlayer(999)).thenThrow(new NotFoundException("Player", 999));
        mvc.perform(get("/api/v1/players/999/goat")).andExpect(status().isNotFound());
        when(points.getPlayerGOATPoints(1, null, true)).thenReturn(new PlayerGOATPoints(null));
        mvc.perform(get("/api/v1/players/1/goat")).andExpect(status().isOk())
            .andExpect(jsonPath("$.totalPoints").value(0)).andExpect(jsonPath("$.seasons").isEmpty());
    }
    @Test void forwardsCustomWeightsAndSortToExistingCalculationEngine() throws Exception {
        when(list.getGOATListTable(anyInt(), any(), any(), any(), anyString(), anyInt(), anyInt())).thenReturn(new BootgridTable<GOATListRow>());
        mvc.perform(get("/api/v1/goatListTable").param("surface", "C").param("tournamentFactor", "2")
            .param("rankingFactor", "0").param("recordsFactor", "3").param("current", "2")
            .param("sort[totalPoints]", "desc"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.rows").isArray());
        verify(list).getGOATListTable(eq(0), eq("C"), any(), argThat(c -> c.getTournamentFactor() == 2 && c.getRankingFactor() == 0 && c.getRecordsFactor() == 3), contains("goat_points DESC"), eq(20), eq(2));
    }
    @Test void servesDatabaseLegend() throws Exception {
        when(legend.getTournamentGOATPoints()).thenReturn(List.of(new TournamentGOATPoints("G", "W", 800, false)));
        when(legend.getWeeksAtNo1ForGOATPoint()).thenReturn(4);
        mvc.perform(get("/api/v1/goat/legend")).andExpect(status().isOk())
            .andExpect(jsonPath("$.tournaments[0].goatPoints").value(800))
            .andExpect(jsonPath("$.weeksAtNo1").value(4));
    }
    @Configuration @EnableWebMvc
    @Import({TennisStatsWebConfig.class, GOATDetailsResource.class, GOATListResource.class})
    static class Config {}
}
