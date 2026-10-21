import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { postTranslations } from "./data/postTranslations";

type Post = {
  id: number | string;
  userId: number;
  title: string;
  body: string;
  category?: string;
};

type Comment = {
  id: number;
  name: string;
  email: string;
  body: string;
};

const POSTS_URL = "https://jsonplaceholder.typicode.com/posts?_limit=20";
const COMMENTS_URL = "https://jsonplaceholder.typicode.com/comments";
const POSTS_STORAGE_KEY = "miniblog-posts";
const AUTH_STORAGE_KEY = "miniblog-authenticated";
const POSTS_PER_PAGE = 6;
const categories = ["Góc nhìn", "Đời sống", "Sáng tạo", "Công nghệ"];

function isPost(value: unknown): value is Post {
  if (typeof value !== "object" || value === null) return false;
  const post = value as Record<string, unknown>;
  return (
    (typeof post.id === "number" || typeof post.id === "string") &&
    typeof post.userId === "number" &&
    typeof post.title === "string" &&
    typeof post.body === "string" &&
    (post.category === undefined || typeof post.category === "string")
  );
}

function isComment(value: unknown): value is Comment {
  if (typeof value !== "object" || value === null) return false;
  const comment = value as Record<string, unknown>;
  return (
    typeof comment.id === "number" &&
    typeof comment.name === "string" &&
    typeof comment.email === "string" &&
    typeof comment.body === "string"
  );
}

function AppLink({
  to,
  navigate,
  children,
  className,
}: {
  to: string;
  navigate: (path: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [query, setQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => window.localStorage.getItem(AUTH_STORAGE_KEY) === "true",
  );

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let savedPosts: Post[] = [];
    try {
      const stored = window.localStorage.getItem(POSTS_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed) || !parsed.every(isPost)) {
          throw new Error("Dữ liệu bài viết đã lưu không hợp lệ.");
        }
        savedPosts = parsed;
      }
      setPosts(savedPosts);
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : "Không thể đọc bài viết đã lưu.",
      );
    }

    const controller = new AbortController();
    async function loadPosts() {
      setPostsLoading(true);
      try {
        const response = await fetch(POSTS_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Máy chủ phản hồi ${response.status}.`);
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isPost)) {
          throw new Error("Dữ liệu bài viết nhận được không hợp lệ.");
        }
        const translatedPosts = data.map((post) => {
          if (typeof post.id !== "number") return post;
          const translation = postTranslations[post.id];
          return translation ? { ...post, ...translation } : post;
        });
        setPosts([
          ...savedPosts,
          ...translatedPosts.filter((post) => !savedPosts.some((saved) => saved.id === post.id)),
        ]);
        setPostsError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setPostsError(
          error instanceof Error
            ? `Không thể tải bài viết: ${error.message}`
            : "Không thể tải bài viết. Vui lòng thử lại.",
        );
      } finally {
        if (!controller.signal.aborted) setPostsLoading(false);
      }
    }

    void loadPosts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (pathname === "/write" && !isLoggedIn) navigate("/login");
  }, [pathname, isLoggedIn]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    if (!normalizedQuery) return posts;
    return posts.filter((post) =>
      post.title.toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [posts, query]);

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
    navigate("/");
  };

  const header = (
    <header className="site-header">
      <div className="header-inner">
        <AppLink to="/" navigate={navigate} className="brand">
          <span className="brand-mark">m.</span>
          <span>mini<span className="brand-light">blog</span></span>
        </AppLink>
        <nav className="main-nav" aria-label="Điều hướng chính">
          <AppLink to="/" navigate={navigate} className={pathname === "/" ? "nav-link active" : "nav-link"}>
            Khám phá
          </AppLink>
          {isLoggedIn ? (
            <>
              <AppLink to="/write" navigate={navigate} className="nav-link">
                Viết bài
              </AppLink>
              <button type="button" className="nav-login" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <AppLink to="/login" navigate={navigate} className="nav-login">
              Đăng nhập <span aria-hidden="true">↗</span>
            </AppLink>
          )}
        </nav>
      </div>
    </header>
  );

  const detailMatch = pathname.match(/^\/posts\/([^/]+)$/);
  const currentPost = detailMatch
    ? posts.find((post) => String(post.id) === detailMatch[1])
    : undefined;

  return (
    <>
      {header}
      {storageError && <div className="global-notice" role="alert">{storageError}</div>}
      {pathname === "/" && (
        <HomePage
          posts={filteredPosts}
          total={posts.length}
          loading={postsLoading}
          error={postsError}
          query={query}
          setQuery={setQuery}
          navigate={navigate}
        />
      )}
      {pathname === "/login" && (
        <LoginPage
          onLogin={() => {
            window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
            setIsLoggedIn(true);
            navigate("/write");
          }}
        />
      )}
      {pathname === "/write" && isLoggedIn && (
        <WritePage
          onCancel={() => navigate("/")}
          onSave={(post) => {
            const updatedPosts = [post, ...posts];
            try {
              const savedPosts = updatedPosts.filter(
                (item) => typeof item.id === "string" && item.id.startsWith("local-"),
              );
              window.localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(savedPosts));
              setPosts(updatedPosts);
              setStorageError("");
              navigate("/");
            } catch (error) {
              setStorageError(
                error instanceof Error ? `Không thể lưu bài viết: ${error.message}` : "Không thể lưu bài viết.",
              );
            }
          }}
        />
      )}
      {detailMatch && (
        currentPost ? (
          <PostDetail key={String(currentPost.id)} post={currentPost} navigate={navigate} />
        ) : postsLoading ? (
          <main className="state-page"><LoadingState label="Đang tìm bài viết..." /></main>
        ) : (
          <NotFound navigate={navigate} />
        )
      )}
      {pathname !== "/" &&
        pathname !== "/login" &&
        pathname !== "/write" &&
        !detailMatch && <NotFound navigate={navigate} />}
    </>
  );
}

function HomePage({
  posts,
  total,
  loading,
  error,
  query,
  setQuery,
  navigate,
}: {
  posts: Post[];
  total: number;
  loading: boolean;
  error: string;
  query: string;
  setQuery: (value: string) => void;
  navigate: (path: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [query]);

  const visiblePosts = posts.slice(0, visibleCount);

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow"><span className="eyebrow-dot" /> MỘT GÓC NHỎ ĐỂ ĐỌC VÀ NGHĨ</p>
          <h1>Những câu chuyện<br />đáng <em>đọc.</em></h1>
          <p className="hero-copy">Ý tưởng hay thường bắt đầu từ những điều giản dị. Tìm câu chuyện tiếp theo của bạn ở đây.</p>
          <div className="hero-bottom">
            <span className="reading-note"><span aria-hidden="true">✳</span> Dành một chút thời gian cho chính mình</span>
            <div className="hero-count"><strong>{total || "—"}</strong><span>bài viết<br />đang chờ bạn</span></div>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun"></div>
          <div className="art-orbit orbit-one"></div>
          <div className="art-orbit orbit-two"></div>
          <div className="book book-back"></div>
          <div className="book book-front"><span>GHI CHÉP<br />NHỎ</span><i></i></div>
          <div className="art-caption">VOL. 01 <span>·</span> EVERYDAY STORIES</div>
          <span className="art-spark spark-one">✳</span>
          <span className="art-spark spark-two">✳</span>
        </div>
      </section>

      <section className="feed-section" id="posts">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TỪ CỘNG ĐỒNG</p>
            <h2>Bài viết mới nhất<span className="heading-period">.</span></h2>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Tìm bài viết..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Tìm kiếm theo tiêu đề"
            />
            <kbd>/</kbd>
          </label>
        </div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {loading && posts.length === 0 ? (
          <LoadingState label="Đang tải những câu chuyện..." />
        ) : posts.length > 0 ? (
          <>
            <div className="post-grid">
              {visiblePosts.map((post, index) => (
                <article className={`post-card ${index === 0 ? "featured-card" : ""}`} key={post.id}>
                  <div className={`post-cover cover-${index % 4}`}>
                    <span className="cover-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="cover-shape" aria-hidden="true">{index % 4 === 0 ? "✳" : index % 4 === 1 ? "◒" : index % 4 === 2 ? "✦" : "◌"}</span>
                    <span className="cover-category">{post.category || categories[index % categories.length]}</span>
                  </div>
                  <div className="post-card-content">
                    <div className="post-meta">
                      <span>{typeof post.id === "string" && post.id.startsWith("local-") ? "BẠN" : `TÁC GIẢ #${post.userId}`}</span>
                      <span className="meta-separator">·</span>
                      <span>{typeof post.id === "string" && post.id.startsWith("local-") ? "VỪA ĐĂNG" : "5 PHÚT ĐỌC"}</span>
                    </div>
                    <AppLink to={`/posts/${encodeURIComponent(String(post.id))}`} navigate={navigate} className="post-title-link">
                      <h3>{post.title}</h3>
                    </AppLink>
                    <p className="post-excerpt">{post.body}</p>
                    <AppLink to={`/posts/${encodeURIComponent(String(post.id))}`} navigate={navigate} className="read-link">
                      Đọc bài viết <span aria-hidden="true">↗</span>
                    </AppLink>
                  </div>
                </article>
              ))}
            </div>
            {visibleCount < posts.length && (
              <div className="load-more">
                <p>Đang hiển thị {visiblePosts.length} / {posts.length} bài viết</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setVisibleCount((count) => count + POSTS_PER_PAGE)}
                >
                  Xem thêm bài viết <span aria-hidden="true">↓</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">⌕</span>
            <h3>{query ? "Không tìm thấy bài viết" : "Chưa có bài viết nào"}</h3>
            <p>{query ? "Thử một từ khóa khác để tìm câu chuyện phù hợp." : "Hiện chưa tải được nội dung. Hãy thử tải lại trang."}</p>
          </div>
        )}
      </section>
      <footer className="site-footer"><span className="footer-brand">mini<span>blog</span></span><span>Một góc nhỏ dành cho những điều đáng nhớ.</span><span>© 2025 MINIBLOG</span></footer>
    </main>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username.trim() !== "admin" || password !== "123456") {
      setError("Tên đăng nhập hoặc mật khẩu chưa chính xác.");
      return;
    }
    setError("");
    onLogin();
  };

  return (
    <main className="form-page">
      <div className="form-aside">
        <p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p>
        <h1>Mỗi câu chuyện<br />đều bắt đầu từ<br /><em>một dòng viết.</em></h1>
        <p>Đăng nhập để chia sẻ góc nhìn của bạn với cộng đồng MiniBlog.</p>
        <span className="aside-decoration" aria-hidden="true">✳</span>
      </div>
      <form className="form-card login-card" onSubmit={handleSubmit}>
        <span className="form-step">01 <i>/ 01</i></span>
        <h2>Đăng nhập</h2>
        <p className="form-intro">Rất vui được gặp lại bạn.</p>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        <label className="field-label" htmlFor="username">Tên đăng nhập</label>
        <input id="username" className="text-input" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
        <label className="field-label" htmlFor="password">Mật khẩu</label>
        <input id="password" className="text-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button className="primary-button full-button" type="submit">Tiếp tục <span aria-hidden="true">↗</span></button>
        <p className="demo-hint">Tài khoản demo: <b>admin</b> / <b>123456</b></p>
      </form>
    </main>
  );
}

function WritePage({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (post: Post) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { title?: string; body?: string } = {};
    if (title.trim().length < 5) nextErrors.title = "Tiêu đề cần có ít nhất 5 ký tự.";
    if (title.trim().length > 100) nextErrors.title = "Tiêu đề không được dài quá 100 ký tự.";
    if (body.trim().length < 20) nextErrors.body = "Nội dung cần có ít nhất 20 ký tự.";
    if (body.trim().length > 5000) nextErrors.body = "Nội dung không được dài quá 5.000 ký tự.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave({
      id: `local-${Date.now()}`,
      userId: 0,
      title: title.trim(),
      body: body.trim(),
      category,
    });
  };

  return (
    <main className="write-page">
      <button type="button" className="back-link" onClick={onCancel}><span aria-hidden="true">←</span> Quay lại trang chủ</button>
      <div className="write-heading">
        <p className="eyebrow">KHÔNG GIAN CỦA BẠN</p>
        <h1>Viết một điều <em>đáng nhớ.</em></h1>
        <p>Chọn từ ngữ của bạn. Câu chuyện sẽ tìm được người đọc phù hợp.</p>
      </div>
      <form className="editor-card" onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="post-category">CHỦ ĐỀ</label>
        <select id="post-category" className="text-input category-select" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <label className="field-label" htmlFor="post-title">TIÊU ĐỀ</label>
        <input
          id="post-title"
          className={`text-input title-input ${errors.title ? "invalid" : ""}`}
          placeholder="Một tiêu đề khiến người ta muốn đọc..."
          maxLength={100}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && <span className="field-error" id="title-error">{errors.title}</span>}
        <label className="field-label" htmlFor="post-body">NỘI DUNG</label>
        <textarea
          id="post-body"
          className={`text-input body-input ${errors.body ? "invalid" : ""}`}
          placeholder="Bắt đầu viết câu chuyện của bạn..."
          maxLength={5000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={errors.body ? "body-error" : "body-count"}
        />
        {errors.body ? <span className="field-error" id="body-error">{errors.body}</span> : <span className="char-count" id="body-count">{body.length} / 5000 ký tự</span>}
        <div className="editor-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Hủy</button>
          <button type="submit" className="primary-button">Đăng bài <span aria-hidden="true">↗</span></button>
        </div>
      </form>
    </main>
  );
}

function PostDetail({ post, navigate }: { post: Post; navigate: (path: string) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLocalPost = typeof post.id === "string" && post.id.startsWith("local-");

  useEffect(() => {
    if (isLocalPost) return;
    const controller = new AbortController();
    async function loadComments() {
      setLoading(true);
      try {
        const response = await fetch(`${COMMENTS_URL}?postId=${encodeURIComponent(String(post.id))}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Máy chủ phản hồi ${response.status}.`);
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isComment)) {
          throw new Error("Dữ liệu bình luận nhận được không hợp lệ.");
        }
        setComments(data);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? `Không thể tải bình luận: ${fetchError.message}` : "Không thể tải bình luận.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadComments();
    return () => controller.abort();
  }, [post.id, isLocalPost]);

  return (
    <main className="detail-page">
      <button type="button" className="back-link" onClick={() => navigate("/")}><span aria-hidden="true">←</span> Tất cả bài viết</button>
      <article className="article">
        <div className="article-topline"><span className="article-category">{post.category || (isLocalPost ? "BÀI VIẾT CỦA BẠN" : "GÓC NHÌN")}</span><span>·</span><span>5 PHÚT ĐỌC</span></div>
        <h1>{post.title}</h1>
        <div className="article-byline">
          <span className="avatar">{isLocalPost ? "B" : String(post.userId)}</span>
          <span><b>{isLocalPost ? "Bạn" : `Tác giả #${post.userId}`}</b><small>Người kể chuyện tại MiniBlog</small></span>
        </div>
        <div className="article-illustration" aria-hidden="true"><span>✳</span><div></div><small>MINIBLOG JOURNAL</small></div>
        <div className="article-body">{post.body.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <div className="article-endmark">✳</div>
      </article>
      <section className="comments-section">
        <div className="comments-heading"><div><p className="eyebrow">CUỘC TRÒ CHUYỆN</p><h2>Bình luận<span className="heading-period">.</span></h2></div><span className="comment-count">{isLocalPost ? "0" : comments.length}</span></div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {loading ? <LoadingState label="Đang tải bình luận..." /> : comments.length > 0 ? (
          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment" key={comment.id}>
                <span className="comment-avatar">{comment.name.charAt(0).toUpperCase()}</span>
                <div><div className="comment-author"><b>{comment.name}</b><span>{comment.email}</span></div><p>{comment.body}</p></div>
              </article>
            ))}
          </div>
        ) : !error && <p className="no-comments">{isLocalPost ? "Bài viết mới chưa có bình luận." : "Chưa có bình luận nào cho bài viết này."}</p>}
      </section>
      <footer className="site-footer"><span className="footer-brand">mini<span>blog</span></span><span>Một góc nhỏ dành cho những điều đáng nhớ.</span><span>© 2025 MINIBLOG</span></footer>
    </main>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><span className="spinner"></span>{label}</div>;
}

function NotFound({ navigate }: { navigate: (path: string) => void }) {
  return (
    <main className="not-found">
      <span className="not-found-code">404</span>
      <p className="eyebrow">LẠC MỘT CHÚT RỒI</p>
      <h1>Trang này không<br />có trong câu chuyện.</h1>
      <p>Liên kết có thể đã cũ hoặc trang bạn tìm không tồn tại.</p>
      <button type="button" className="primary-button" onClick={() => navigate("/")}>Về trang chủ <span aria-hidden="true">↗</span></button>
    </main>
  );
}

export default App;
