package dev.btstudio.fmfskins;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;

/** Local-only PNG storage and the current client-side texture. */
public final class SkinStore {
    private static final long MAX_SIZE = 2L * 1024 * 1024;
    private static final byte[] PNG = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
    private static final Path ROOT = FabricLoader.getInstance().getGameDir().resolve("minecraft-skins");
    private static final Path IMPORTS = ROOT.resolve("imports");
    private static final Path LIBRARY = ROOT.resolve("saved");
    private static final Path ACTIVE = ROOT.resolve("active.png");
    private static final Path MODEL = ROOT.resolve("active-model.txt");
    private static Identifier texture;
    private static boolean slim;
    private static boolean restoreAttempted;
    private static int serial;

    private SkinStore() {}
    public static Identifier texture() { return texture; }
    public static boolean isSlim() { return slim; }
    public static Path root() { return ROOT; }

    public static void initialize() throws IOException {
        Files.createDirectories(IMPORTS);
        Files.createDirectories(LIBRARY);
    }

    private static String safeName(String input) throws IOException {
        if (!input.matches("[A-Za-z0-9_-]{1,64}")) throw new IOException("Use 1–64 letters, numbers, underscores or hyphens for the name.");
        return input;
    }

    private static Path existingFile(Path directory, String name) throws IOException {
        Path root = directory.toRealPath();
        Path file = directory.resolve(safeName(name) + ".png").toRealPath();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) throw new IOException("Skin is outside the skin folder.");
        return file;
    }

    private static byte[] readPng(Path file) throws IOException {
        if (Files.size(file) > MAX_SIZE) throw new IOException("PNG is larger than 2 MB.");
        byte[] bytes = Files.readAllBytes(file);
        if (bytes.length > MAX_SIZE || bytes.length < 24) throw new IOException("Not a valid PNG.");
        for (int i = 0; i < PNG.length; i++) if (bytes[i] != PNG[i]) throw new IOException("Not a PNG file.");
        if (bytes[12] != 'I' || bytes[13] != 'H' || bytes[14] != 'D' || bytes[15] != 'R') throw new IOException("Invalid PNG header.");
        int width = java.nio.ByteBuffer.wrap(bytes, 16, 4).getInt();
        int height = java.nio.ByteBuffer.wrap(bytes, 20, 4).getInt();
        if (width != 64 || height != 64) throw new IOException("Skin must be 64×64 pixels.");
        return bytes;
    }

    private static NativeImage decode(byte[] bytes) throws IOException {
        NativeImage image = NativeImage.read(bytes);
        if (image.getWidth() != 64 || image.getHeight() != 64) {
            image.close();
            throw new IOException("Skin must be 64×64 pixels.");
        }
        return image;
    }

    private static void replaceFile(Path path, byte[] content) throws IOException {
        Path temp = Files.createTempFile(ROOT, "fmf-skins-", ".tmp");
        try {
            Files.write(temp, content);
            Files.move(temp, path, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    private static void display(MinecraftClient client, NativeImage image, boolean useSlim) {
        Identifier next = new Identifier("fmf_skins", "local/skin_" + (++serial));
        NativeImageBackedTexture newTexture = new NativeImageBackedTexture(image);
        client.getTextureManager().registerTexture(next, newTexture);
        Identifier old = texture;
        texture = next;
        slim = useSlim;
        if (old != null) client.getTextureManager().destroyTexture(old);
    }

    public static void apply(MinecraftClient client, String name, boolean fromImports, String model) throws IOException {
        if (!model.equals("slim") && !model.equals("classic")) throw new IOException("Model must be classic or slim.");
        Path source = existingFile(fromImports ? IMPORTS : LIBRARY, name);
        byte[] data = readPng(source);
        NativeImage image = decode(data);
        try {
            replaceFile(ACTIVE, data);
            replaceFile(MODEL, model.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            display(client, image, model.equals("slim"));
        } catch (IOException | RuntimeException error) {
            image.close();
            throw error;
        }
    }

    public static void save(String name) throws IOException {
        Path target = LIBRARY.resolve(safeName(name) + ".png");
        if (!Files.isRegularFile(ACTIVE)) throw new IOException("Apply a skin first.");
        // Refuse to overwrite saved designs, including symlinks.
        Files.copy(ACTIVE, target);
    }

    public static String list() throws IOException {
        try (java.util.stream.Stream<Path> files = Files.list(LIBRARY)) {
            String items = files.filter(path -> Files.isRegularFile(path) && path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".png"))
                    .map(path -> path.getFileName().toString()).sorted().limit(100).reduce((a, b) -> a + ", " + b).orElse("No saved skins.");
            return items;
        }
    }

    public static void clear(MinecraftClient client) throws IOException {
        Files.deleteIfExists(ACTIVE);
        Files.deleteIfExists(MODEL);
        if (texture != null) client.getTextureManager().destroyTexture(texture);
        texture = null;
    }

    public static void restoreOnce(MinecraftClient client) {
        if (restoreAttempted) return;
        restoreAttempted = true;
        if (!Files.isRegularFile(ACTIVE)) return;
        try {
            byte[] data = readPng(ACTIVE);
            String model = Files.isRegularFile(MODEL) ? Files.readString(MODEL).trim() : "classic";
            NativeImage image = decode(data);
            try { display(client, image, model.equals("slim")); }
            catch (RuntimeException error) { image.close(); throw error; }
        } catch (IOException | RuntimeException error) {
            System.err.println("[Minecraft Skins] Could not restore local skin: " + error.getMessage());
        }
    }
}
