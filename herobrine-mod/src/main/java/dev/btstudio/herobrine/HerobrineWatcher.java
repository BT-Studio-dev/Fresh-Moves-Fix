package dev.btstudio.herobrine;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;

/** Experimental non-hostile apparition, controlled on the server. */
public final class HerobrineWatcher implements ModInitializer {
    private static final String TAG = "fmf_herobrine_watcher";
    private int ticks;

    @Override
    public void onInitialize() {
        ServerTickEvents.END_SERVER_TICK.register(server -> {
            ticks++;
            // Remove sightings after 20 seconds; repeat every five minutes.
            if (ticks == 400) run(server, "kill @e[type=minecraft:armor_stand,tag=" + TAG + "]");
            if (ticks >= 6000) {
                ticks = 0;
                // Spawn at the terrain surface eight blocks from each player, not at their head height.
                run(server, "execute as @a at @s positioned ~8 ~ ~8 positioned over motion_blocking_no_leaves "
                        + "unless entity @e[type=minecraft:armor_stand,tag=" + TAG + ",distance=..64] "
                        + "run summon minecraft:armor_stand ~ ~ ~ {Tags:[\"" + TAG + "\"],ShowArms:1b,NoBasePlate:1b,Invulnerable:1b,Silent:1b}");
                run(server, "execute as @e[type=minecraft:armor_stand,tag=" + TAG + "] run item replace entity @s armor.head with minecraft:player_head[minecraft:profile={name:\"Herobrine\"}]");
                run(server, "execute as @e[type=minecraft:armor_stand,tag=" + TAG + "] run item replace entity @s armor.chest with minecraft:diamond_chestplate");
                run(server, "execute as @e[type=minecraft:armor_stand,tag=" + TAG + "] run item replace entity @s armor.legs with minecraft:diamond_leggings");
            }
            if (ticks % 20 == 0) {
                run(server, "execute as @e[type=minecraft:armor_stand,tag=" + TAG + "] at @s "
                        + "facing entity @p eyes run tp @s ~ ~ ~ ~ ~");
            }
        });
    }

    private static void run(MinecraftServer server, String command) {
        server.getCommands().performPrefixedCommand(server.createCommandSourceStack().withSuppressedOutput(), command);
    }
}
