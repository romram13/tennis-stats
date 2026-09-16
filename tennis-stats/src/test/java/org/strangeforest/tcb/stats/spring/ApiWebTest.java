package org.strangeforest.tcb.stats.spring;

import java.util.*;
import javax.servlet.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.boot.web.servlet.error.*;
import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.test.context.*;
import org.springframework.test.context.junit.jupiter.*;
import org.springframework.test.context.web.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.*;
import org.springframework.web.context.*;
import org.springframework.web.servlet.config.annotation.*;
import org.strangeforest.tcb.stats.controller.*;
import org.strangeforest.tcb.stats.model.core.*;
import org.strangeforest.tcb.stats.service.*;
import org.strangeforest.tcb.stats.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(ApiWebTest.Config.class)
@WebAppConfiguration
@TestPropertySource(properties = "tennis-stats.api.allowed-origins=http://localhost:3000")
class ApiWebTest {

	@Autowired WebApplicationContext context;
	@MockBean PlayerService playerService;
	MockMvc mvc;

	@BeforeEach void setup() {
		reset(playerService);
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	@Test void servesJsonUnderVersionedPrefix() throws Exception {
		when(playerService.getPlayerSeasons(1)).thenReturn(List.of(2025, 2026));
		mvc.perform(get("/api/v1/players/1/seasons"))
			.andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(content().json("[2025,2026]"));
		mvc.perform(get("/players/1/seasons")).andExpect(status().isNotFound());
	}

	@Test void rejectsUnknownPlayer() throws Exception {
		when(playerService.getPlayer(999)).thenThrow(new NotFoundException("Player", 999));
		mvc.perform(get("/api/v1/players/999")).andExpect(status().isNotFound());
	}

	@Test void servesPlayerWithMissingBackhand() throws Exception {
		Player player = new Player(57819);
		player.setHand("R");
		when(playerService.getPlayer(57819)).thenReturn(player);
		mvc.perform(get("/api/v1/players/57819"))
			.andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.id").value(57819))
			.andExpect(jsonPath("$.handName").value("Right-handed"))
			.andExpect(jsonPath("$.backhandName").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test void servesPlayerWithMissingHand() throws Exception {
		Player player = new Player(57819);
		player.setBackhand("2");
		when(playerService.getPlayer(57819)).thenReturn(player);
		mvc.perform(get("/api/v1/players/57819"))
			.andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.id").value(57819))
			.andExpect(jsonPath("$.handName").value(org.hamcrest.Matchers.nullValue()))
			.andExpect(jsonPath("$.backhandName").value("Two-handed"));
	}

	@Test void allowsConfiguredFrontendOriginOnly() throws Exception {
		mvc.perform(options("/api/v1/players/1").header("Origin", "http://localhost:3000")
			.header("Access-Control-Request-Method", "GET"))
			.andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
		mvc.perform(options("/api/v1/players/1").header("Origin", "https://unconfigured.example")
			.header("Access-Control-Request-Method", "GET")).andExpect(status().isForbidden());
	}

	@Test void doesNotServeLegacyPages() throws Exception {
		mvc.perform(get("/")).andExpect(status().isNotFound());
		mvc.perform(get("/playerProfile?playerId=1")).andExpect(status().isNotFound());
	}

	@Test void errorsStayJsonForBrowserRequests() throws Exception {
		MockMvcBuilders.standaloneSetup(new ApiErrorController(new DefaultErrorAttributes())).build()
			.perform(get("/error").accept(MediaType.TEXT_HTML)
				.requestAttr(RequestDispatcher.ERROR_STATUS_CODE, 404)
				.requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/missing"))
			.andExpect(status().isNotFound()).andExpect(content().contentType(MediaType.APPLICATION_JSON))
			.andExpect(jsonPath("$.status").value(404));
	}

	@Test void maintenanceReturns503WithoutRedirecting() throws Exception {
		MockMvcBuilders.standaloneSetup(new PlayersResource(playerService))
			.addInterceptors(new DownForMaintenanceInterceptor()).build()
			.perform(get("/players/1"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(header().string("Retry-After", "300"))
			.andExpect(header().doesNotExist("Location"))
			.andExpect(content().contentType(MediaType.APPLICATION_JSON));
	}

	@Configuration
	@EnableWebMvc
	@Import({TennisStatsWebConfig.class, PlayersResource.class})
	static class Config {
	}
}
