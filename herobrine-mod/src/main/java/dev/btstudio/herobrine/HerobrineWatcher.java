package dev.btstudio.herobrine;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.permissions.Permissions;

/** Experimental non-hostile apparition, controlled on the server. */
public final class HerobrineWatcher implements ModInitializer {
    private static final String TAG = "fmf_herobrine_watcher";
    private int ticks;

    @Override
    public void onInitialize() {
        CommandRegistrationCallback.EVENT.register((dispatcher, registry, environment) ->
            dispatcher.register(Commands.literal("herobrine")
                .requires(source -> source.permissions().hasPermission(Permissions.COMMANDS_GAMEMASTER))
                .executes(context -> {
                    var source = context.getSource();
                    var player = source.getPlayerOrException();
                    // Replace an old nearby watcher so the command can be used repeatedly.
                    String target = player.getStringUUID();
                    run(source.getServer(), "execute as " + target + " at @s run kill @e[type=minecraft:armor_stand,tag=" + TAG + ",distance=..64]");
                    spawnFor(source.getServer(), target);
                    ticks = 0;
                    source.sendSuccess(() -> Component.literal("Trying to summon Herobrine nearby. Look around!"), false);
                    return 1;
                })));
        ServerTickEvents.END_SERVER_TICK.register(server -> {
            ticks++;
            if (ticks == 400) run(server, "kill @e[type=minecraft:armor_stand,tag=" + TAG + "]");
            if (ticks >= 6000) {
                ticks = 0;
                spawnFor(server, "@a");
            }
            if (ticks % 20 == 0) {
                run(server, "execute as @e[type=minecraft:armor_stand,tag=" + TAG + "] at @s "
                        + "facing entity @p eyes run tp @s ~ ~ ~ ~ ~");
            }
        });
    }

    private static void spawnFor(MinecraftServer server, String target) {
        String atPlayer = "execute as " + target + " at @s ";
        run(server, atPlayer + "positioned ~8 ~ ~8 positioned over motion_blocking_no_leaves "
                + "unless entity @e[type=minecraft:armor_stand,tag=" + TAG + ",distance=..64] "
                + "run summon minecraft:armor_stand ~ ~ ~ {Tags:[\"" + TAG + "\",\"fmf_herobrine_new\"],ShowArms:1b,NoBasePlate:1b,Invulnerable:1b,Silent:1b}");
        String nearby = "@e[type=minecraft:armor_stand,tag=" + TAG + ",tag=fmf_herobrine_new,distance=..64]";
        run(server, atPlayer + "as " + nearby + " at @s run playsound minecraft:ambient.cave ambient @a[distance=..32] ~ ~ ~ 1 0.7");
        run(server, atPlayer + "as " + nearby + " run item replace entity @s armor.head with minecraft:player_head[minecraft:profile={name:\"MHF_Herobrine\"}]");
        run(server, atPlayer + "as " + nearby + " run item replace entity @s armor.chest with minecraft:diamond_chestplate");
        run(server, atPlayer + "as " + nearby + " run item replace entity @s armor.legs with minecraft:diamond_leggings");
        run(server, atPlayer + "run tag " + nearby + " remove fmf_herobrine_new");
    }

    private static void run(MinecraftServer server, String command) {
        server.getCommands().performPrefixedCommand(server.createCommandSourceStack().withSuppressedOutput(), command);
    }
}
