package org.strangeforest.tcb.stats.controller;

import java.util.*;

import org.springframework.web.bind.annotation.*;
import org.strangeforest.tcb.stats.model.core.*;
import org.strangeforest.tcb.stats.service.*;

@RestController
public class PlayersResource {

	private final PlayerService playerService;

	public PlayersResource(PlayerService playerService) {
		this.playerService = playerService;
	}

	@GetMapping("/players/{playerId}")
	public Player player(@PathVariable("playerId") int playerId) {
		return playerService.getPlayer(playerId);
	}

	@GetMapping("/players/{playerId}/seasons")
	public List<Integer> seasons(@PathVariable("playerId") int playerId) {
		playerService.getPlayer(playerId);
		return playerService.getPlayerSeasons(playerId);
	}
}
