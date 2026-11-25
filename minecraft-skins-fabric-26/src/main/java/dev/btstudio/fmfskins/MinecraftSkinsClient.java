package dev.btstudio.fmfskins;

import com.mojang.brigadier.arguments.StringArgumentType;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.network.chat.Component;
import java.io.IOException;

import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.argument;
import static net.fabricmc.fabric.api.client.command.v2.ClientCommands.literal;

public final class MinecraftSkinsClient implements ClientModInitializer {
    @FunctionalInterface private interface Action { String run() throws IOException; }

    private static int run(FabricClientCommandSource source, Action action) {
        try { source.sendFeedback(Component.literal(action.run())); return 1; }
        catch (IOException | RuntimeException error) { source.sendError(Component.literal("Minecraft Skins: " + error.getMessage())); return 0; }
    }

    private static String apply(FabricClientCommandSource source, String name, boolean fromImports, String model) throws IOException {
        SkinStore.initialize();
        SkinStore.apply(source.getClient(), name, fromImports, model);
        return "Local skin applied (" + model + "). Only you can see it. Use /fmfskins save <name> to save a copy.";
    }

    @Override public void onInitializeClient() {
        try { SkinStore.initialize(); } catch (IOException error) { System.err.println("[Minecraft Skins] Could not create directories: " + error.getMessage()); }
        ClientTickEvents.END_CLIENT_TICK.register(client -> SkinStore.restoreOnce(client));
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> dispatcher.register(
            literal("fmfskins")
                .executes(context -> run(context.getSource(), () -> "Use /fmfskins import <name> [classic|slim], apply <name> [classic|slim], save <name>, list, or clear. PNG imports: " + SkinStore.root().resolve("imports")))
                .then(literal("import").then(argument("name", StringArgumentType.word())
                    .executes(context -> run(context.getSource(), () -> apply(context.getSource(), StringArgumentType.getString(context, "name"), true, "classic")))
                    .then(literal("classic").executes(context -> run(context.getSource(), () -> apply(context.getSource(), StringArgumentType.getString(context, "name"), true, "classic"))))
                    .then(literal("slim").executes(context -> run(context.getSource(), () -> apply(context.getSource(), StringArgumentType.getString(context, "name"), true, "slim"))))))
                .then(literal("apply").then(argument("name", StringArgumentType.word())
                    .executes(context -> run(context.getSource(), () -> apply(context.getSource(), StringArgumentType.getString(context, "name"), false, "classic")))
                    .then(literal("classic").executes(context -> run(context.getSource(), () -> apply(context.getSource(), StringArgumentType.getString(context, "name"), false, "classic"))))
                    .then(literal("slim").executes(context -> run(context.getSource(), () -> apply(context.getSource(), StringArgumentType.getString(context, "name"), false, "slim"))))))
                .then(literal("save").then(argument("name", StringArgumentType.word()).executes(context -> run(context.getSource(), () -> {
                    SkinStore.initialize(); SkinStore.save(StringArgumentType.getString(context, "name")); return "Saved skin. Use /fmfskins list to see saved files.";
                }))))
                .then(literal("list").executes(context -> run(context.getSource(), () -> { SkinStore.initialize(); return "Saved skins: " + SkinStore.list(); })))
                .then(literal("clear").executes(context -> run(context.getSource(), () -> { SkinStore.clear(context.getSource().getClient()); return "Local skin cleared. Your account skin is unchanged."; })))
        ));
    }
}
